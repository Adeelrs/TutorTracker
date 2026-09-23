const { query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { ensureStudentAccess } = require('./userService');
const { getBookingById } = require('./bookingService');
const { logAction } = require('./auditLogService');
const { ensureApprovedTutor } = require('../utils/guards');

const ATTENDANCE_STATUSES = ['not_present', 'present', 'late', 'cancelled'];

const normaliseAttendanceStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  return ATTENDANCE_STATUSES.includes(status) ? status : 'not_present';
};

const parseDateTimeValue = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    const parsed = new Date(text.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normaliseDatePart = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = parseDateTimeValue(text);

  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normaliseTimePart = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return text.slice(0, 5);
  }

  const parsed = parseDateTimeValue(text);

  if (!parsed) {
    return '';
  }

  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

const normaliseExistingSessionDateTime = (value) => {
  const parsed = parseDateTimeValue(value);

  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};

const normaliseBookingSessionDateTime = (bookingDate, startTime) => {
  const datePart = normaliseDatePart(bookingDate);
  const timePart = normaliseTimePart(startTime);

  if (!datePart || !timePart) {
    return '';
  }

  return `${datePart} ${timePart}:00`;
};

const resolveBookingStatusFromSessionDate = (sessionDateTime) => {
  const parsed = parseDateTimeValue(sessionDateTime);

  if (!parsed) {
    return 'confirmed';
  }

  return parsed.getTime() <= Date.now() ? 'completed' : 'confirmed';
};

const buildSessionScope = async (user, filters = {}) => {
  const params = [];
  const whereParts = ['1 = 1'];

  if (user.role === 'tutor') {
    whereParts.push('sessions.tutor_user_id = ?');
    params.push(user.id);
  }

  if (user.role === 'student') {
    whereParts.push('sessions.student_user_id = ?');
    params.push(user.id);
  }

  if (user.role === 'parent') {
    whereParts.push(
      `sessions.student_user_id IN (
        SELECT student_user_id
        FROM parent_students
        WHERE parent_user_id = ?
      )`
    );
    params.push(user.id);
  }

  if (filters.studentUserId) {
    const studentUserId = Number(filters.studentUserId);

    if (user.role !== 'manager') {
      await ensureStudentAccess(user, studentUserId);
    }

    whereParts.push('sessions.student_user_id = ?');
    params.push(studentUserId);
  }

  if (filters.tutorUserId && user.role === 'manager') {
    whereParts.push('sessions.tutor_user_id = ?');
    params.push(Number(filters.tutorUserId));
  }

  return {
    whereClause: whereParts.join(' AND '),
    params
  };
};

const enrichSession = (row) => ({
  ...row,
  exam_board: row.exam_board || row.booking_exam_board || 'General',
  attendance_status: normaliseAttendanceStatus(row.attendance_status)
});

const listSessions = async (user, filters = {}) => {
  const { whereClause, params } = await buildSessionScope(user, filters);

  const rows = await query(
    `
      SELECT
        sessions.*,
        tutor.full_name AS tutor_name,
        student.full_name AS student_name,
        student.platform_user_id AS student_platform_user_id,
        bookings.status AS booking_status,
        bookings.subject AS booking_subject,
        bookings.exam_board AS booking_exam_board,
        COALESCE(bookings.parent_user_id, guardian_link.parent_user_id) AS parent_user_id,
        parent.full_name AS parent_name,
        COALESCE(parent.phone_number, parent_profile.phone) AS parent_phone_number
      FROM sessions
      INNER JOIN users AS tutor ON tutor.id = sessions.tutor_user_id
      INNER JOIN users AS student ON student.id = sessions.student_user_id
      LEFT JOIN bookings ON bookings.id = sessions.booking_id
      LEFT JOIN (
        SELECT
          student_user_id,
          MIN(parent_user_id) AS parent_user_id
        FROM parent_students
        GROUP BY student_user_id
      ) AS guardian_link ON guardian_link.student_user_id = sessions.student_user_id
      LEFT JOIN users AS parent ON parent.id = COALESCE(bookings.parent_user_id, guardian_link.parent_user_id)
      LEFT JOIN parents AS parent_profile ON parent_profile.user_id = parent.id
      WHERE ${whereClause}
      ORDER BY sessions.session_date DESC
    `,
    params
  );

  return rows.map(enrichSession);
};

const getSessionById = async (user, sessionId) => {
  const rows = await query(
    `
      SELECT
        sessions.*,
        tutor.full_name AS tutor_name,
        student.full_name AS student_name,
        student.platform_user_id AS student_platform_user_id,
        bookings.status AS booking_status,
        bookings.subject AS booking_subject,
        bookings.exam_board AS booking_exam_board,
        COALESCE(bookings.parent_user_id, guardian_link.parent_user_id) AS parent_user_id,
        parent.full_name AS parent_name,
        COALESCE(parent.phone_number, parent_profile.phone) AS parent_phone_number
      FROM sessions
      INNER JOIN users AS tutor ON tutor.id = sessions.tutor_user_id
      INNER JOIN users AS student ON student.id = sessions.student_user_id
      LEFT JOIN bookings ON bookings.id = sessions.booking_id
      LEFT JOIN (
        SELECT
          student_user_id,
          MIN(parent_user_id) AS parent_user_id
        FROM parent_students
        GROUP BY student_user_id
      ) AS guardian_link ON guardian_link.student_user_id = sessions.student_user_id
      LEFT JOIN users AS parent ON parent.id = COALESCE(bookings.parent_user_id, guardian_link.parent_user_id)
      LEFT JOIN parents AS parent_profile ON parent_profile.user_id = parent.id
      WHERE sessions.id = ?
      LIMIT 1
    `,
    [sessionId]
  );

  const session = rows[0];

  if (!session) {
    throw new ApiError(404, 'Session report not found');
  }

  if (user.role !== 'manager') {
    await ensureStudentAccess(user, session.student_user_id);
  }

  if (user.role === 'tutor' && session.tutor_user_id !== user.id) {
    throw new ApiError(403, 'You can only access your own session reports');
  }

  return enrichSession(session);
};

const validateSessionPayload = (payload) => {
  const requiredFields = ['studentUserId', 'topic', 'sessionDate', 'durationMinutes'];
  const missingField = requiredFields.find((field) => !payload[field] && payload[field] !== 0);

  if (missingField) {
    throw new ApiError(400, `${missingField} is required`);
  }
};

const createSession = async (user, payload) => {
  if (!['tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'Only tutors and managers can create session reports');
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);
  }

  const booking = payload.bookingId ? await getBookingById(user, Number(payload.bookingId)) : null;
  const tutorUserId = user.role === 'manager' ? Number(payload.tutorUserId || booking?.tutor_user_id) : user.id;
  const studentUserId = Number(payload.studentUserId || booking?.student_user_id);
  const resolvedSessionDate = payload.sessionDate
    ? normaliseExistingSessionDateTime(payload.sessionDate)
    : normaliseBookingSessionDateTime(booking?.booking_date, booking?.start_time);

  validateSessionPayload({
    studentUserId,
    topic: payload.topic || booking?.subject,
    sessionDate: resolvedSessionDate,
    durationMinutes: payload.durationMinutes || booking?.duration_minutes
  });

  if (user.role === 'tutor') {
    await ensureStudentAccess(user, studentUserId);
  }

  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `
        INSERT INTO sessions (
          tutor_user_id,
          student_user_id,
          booking_id,
          topic,
          exam_board,
          session_date,
          duration_minutes,
          notes,
          attendance_status,
          homework_set,
          next_steps,
          assessment_note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tutorUserId,
        studentUserId,
        booking ? booking.id : null,
        String(payload.topic || booking?.subject).trim(),
        String(payload.examBoard || booking?.exam_board || 'General').trim() || 'General',
        resolvedSessionDate,
        Number(payload.durationMinutes || booking?.duration_minutes),
        payload.notes?.trim() || null,
        normaliseAttendanceStatus(payload.attendanceStatus || booking?.attendance_status),
        payload.homeworkSet?.trim() || null,
        payload.nextSteps?.trim() || null,
        payload.assessmentNote?.trim() || null
      ]
    );

    if (booking) {
      const bookingStatus = resolveBookingStatusFromSessionDate(resolvedSessionDate);

      await connection.execute(
        `
          UPDATE bookings
          SET status = ?,
              attendance_status = ?,
              updated_at = NOW()
          WHERE id = ?
        `,
        [bookingStatus, normaliseAttendanceStatus(payload.attendanceStatus || booking.attendance_status), booking.id]
      );
    }

    await logAction({
      actorUserId: user.id,
      action: 'session_saved',
      targetType: 'session',
      targetId: result.insertId,
      details: {
        tutorUserId,
        studentUserId,
        bookingId: booking?.id || null
      },
      connection
    });

    return result.insertId;
  });
};

const updateSession = async (user, sessionId, payload) => {
  const existingSession = await getSessionById(user, sessionId);

  if (!['tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'Only tutors and managers can update session reports');
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);

    if (existingSession.tutor_user_id !== user.id) {
      throw new ApiError(403, 'You can only update your own session reports');
    }
  }

  const nextPayload = {
    studentUserId: existingSession.student_user_id,
    topic: payload.topic || existingSession.topic,
    sessionDate: payload.sessionDate
      ? normaliseExistingSessionDateTime(payload.sessionDate)
      : normaliseExistingSessionDateTime(existingSession.session_date),
    durationMinutes: payload.durationMinutes || existingSession.duration_minutes
  };

  validateSessionPayload(nextPayload);

  return withTransaction(async (connection) => {
    await connection.execute(
      `
        UPDATE sessions
        SET topic = ?,
            exam_board = ?,
            session_date = ?,
            duration_minutes = ?,
            notes = ?,
            attendance_status = ?,
            homework_set = ?,
            next_steps = ?,
            assessment_note = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [
        String(nextPayload.topic).trim(),
        String(payload.examBoard || existingSession.exam_board || 'General').trim() || 'General',
        nextPayload.sessionDate,
        Number(nextPayload.durationMinutes),
        payload.notes?.trim?.() ?? existingSession.notes,
        normaliseAttendanceStatus(payload.attendanceStatus || existingSession.attendance_status),
        payload.homeworkSet?.trim?.() ?? existingSession.homework_set,
        payload.nextSteps?.trim?.() ?? existingSession.next_steps,
        payload.assessmentNote?.trim?.() ?? existingSession.assessment_note,
        sessionId
      ]
    );

    if (existingSession.booking_id) {
      const bookingStatus = resolveBookingStatusFromSessionDate(nextPayload.sessionDate);

      await connection.execute(
        `
          UPDATE bookings
          SET status = ?,
              attendance_status = ?,
              updated_at = NOW()
          WHERE id = ?
        `,
        [bookingStatus, normaliseAttendanceStatus(payload.attendanceStatus || existingSession.attendance_status), existingSession.booking_id]
      );
    }

    await logAction({
      actorUserId: user.id,
      action: 'session_updated',
      targetType: 'session',
      targetId: sessionId,
      details: {
        tutorUserId: existingSession.tutor_user_id,
        studentUserId: existingSession.student_user_id
      },
      connection
    });
  });
};

const deleteSession = async (user, sessionId) => {
  const existingSession = await getSessionById(user, sessionId);

  if (!['tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'Only tutors and managers can delete session reports');
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);

    if (existingSession.tutor_user_id !== user.id) {
      throw new ApiError(403, 'You can only delete your own session reports');
    }
  }

  return withTransaction(async (connection) => {
    await connection.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);

    if (existingSession.booking_id) {
      await connection.execute(
        `
          UPDATE bookings
          SET status = 'confirmed',
              updated_at = NOW()
          WHERE id = ?
        `,
        [existingSession.booking_id]
      );
    }

    await logAction({
      actorUserId: user.id,
      action: 'session_deleted',
      targetType: 'session',
      targetId: sessionId,
      details: {
        tutorUserId: existingSession.tutor_user_id,
        studentUserId: existingSession.student_user_id
      },
      connection
    });
  });
};

module.exports = {
  listSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession
};
