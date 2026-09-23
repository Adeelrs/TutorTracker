const { query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { ensureStudentAccess } = require('./userService');
const { logAction } = require('./auditLogService');
const { ensureApprovedTutor } = require('../utils/guards');

const ATTENDANCE_STATUSES = ['not_present', 'present', 'late', 'cancelled'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

const isPastBookingDate = (value) => {
  if (!value) {
    return false;
  }

  const bookingDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bookingDate < today;
};

const normaliseAttendanceStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  return ATTENDANCE_STATUSES.includes(status) ? status : 'not_present';
};

const buildBookingScope = async (user, filters = {}) => {
  const params = [];
  const whereParts = ['1 = 1'];

  if (user.role === 'tutor') {
    whereParts.push('bookings.tutor_user_id = ?');
    params.push(user.id);
  }

  if (user.role === 'student') {
    whereParts.push('bookings.student_user_id = ?');
    params.push(user.id);
  }

  if (user.role === 'parent') {
    whereParts.push(
      `(
        bookings.parent_user_id = ?
        OR bookings.student_user_id IN (
          SELECT student_user_id
          FROM parent_students
          WHERE parent_user_id = ?
        )
      )`
    );
    params.push(user.id, user.id);
  }

  if (filters.studentUserId) {
    const studentUserId = Number(filters.studentUserId);

    if (user.role !== 'manager') {
      await ensureStudentAccess(user, studentUserId);
    }

    whereParts.push('bookings.student_user_id = ?');
    params.push(studentUserId);
  }

  if (filters.tutorUserId && user.role === 'manager') {
    whereParts.push('bookings.tutor_user_id = ?');
    params.push(Number(filters.tutorUserId));
  }

  return {
    whereClause: whereParts.join(' AND '),
    params
  };
};

const enrichBooking = (row) => ({
  ...row,
  exam_board: row.exam_board || 'General',
  attendance_status: normaliseAttendanceStatus(row.attendance_status)
});

const listBookings = async (user, filters = {}) => {
  const { whereClause, params } = await buildBookingScope(user, filters);

  const rows = await query(
    `
      SELECT
        bookings.*,
        tutor.full_name AS tutor_name,
        student.full_name AS student_name,
        student.platform_user_id AS student_platform_user_id,
        parent.full_name AS parent_name,
        COALESCE(parent.phone_number, parent_profile.phone) AS parent_phone_number,
        requester.full_name AS requested_by_name
      FROM bookings
      INNER JOIN users AS tutor ON tutor.id = bookings.tutor_user_id
      INNER JOIN users AS student ON student.id = bookings.student_user_id
      LEFT JOIN users AS parent ON parent.id = bookings.parent_user_id
      LEFT JOIN parents AS parent_profile ON parent_profile.user_id = parent.id
      INNER JOIN users AS requester ON requester.id = bookings.requested_by_user_id
      WHERE ${whereClause}
      ORDER BY bookings.booking_date DESC, bookings.start_time DESC
    `,
    params
  );

  return rows.map(enrichBooking);
};

const getBookingById = async (user, bookingId) => {
  const rows = await query(
    `
      SELECT
        bookings.*,
        tutor.full_name AS tutor_name,
        student.full_name AS student_name,
        student.platform_user_id AS student_platform_user_id,
        parent.full_name AS parent_name,
        COALESCE(parent.phone_number, parent_profile.phone) AS parent_phone_number,
        requester.full_name AS requested_by_name
      FROM bookings
      INNER JOIN users AS tutor ON tutor.id = bookings.tutor_user_id
      INNER JOIN users AS student ON student.id = bookings.student_user_id
      LEFT JOIN users AS parent ON parent.id = bookings.parent_user_id
      LEFT JOIN parents AS parent_profile ON parent_profile.user_id = parent.id
      INNER JOIN users AS requester ON requester.id = bookings.requested_by_user_id
      WHERE bookings.id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  const booking = rows[0];

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (user.role !== 'manager') {
    await ensureStudentAccess(user, booking.student_user_id);
  }

  if (user.role === 'tutor' && booking.tutor_user_id !== user.id) {
    throw new ApiError(403, 'You can only access your own bookings');
  }

  return enrichBooking(booking);
};

const validateCreateBookingPayload = (payload) => {
  const requiredFields = [
    'tutorUserId',
    'studentUserId',
    'subject',
    'bookingDate',
    'startTime',
    'durationMinutes'
  ];

  const missingField = requiredFields.find((field) => !payload[field] && payload[field] !== 0);

  if (missingField) {
    throw new ApiError(400, `${missingField} is required`);
  }
};

const createBooking = async (user, payload) => {
  if (!['student', 'parent', 'tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'You cannot create bookings');
  }

  validateCreateBookingPayload(payload);

  const tutorUserId = Number(payload.tutorUserId);
  const studentUserId = Number(payload.studentUserId);

  if (isPastBookingDate(payload.bookingDate)) {
    throw new ApiError(400, 'Bookings cannot be created in the past');
  }

  if (user.role === 'student' && studentUserId !== user.id) {
    throw new ApiError(403, 'Students can only create bookings for themselves');
  }

  if (user.role === 'parent') {
    await ensureStudentAccess(user, studentUserId);
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);
  }

  return withTransaction(async (connection) => {
    const [conflictingRows] = await connection.execute(
      `
        SELECT id
        FROM bookings
        WHERE tutor_user_id = ?
          AND booking_date = ?
          AND start_time = ?
          AND status IN ('pending', 'confirmed', 'completed')
        LIMIT 1
      `,
      [tutorUserId, payload.bookingDate, payload.startTime]
    );

    if (conflictingRows[0]) {
      throw new ApiError(409, 'That tutor already has a booking at the selected time');
    }

    const [parentRows] = await connection.execute(
      `
        SELECT parent_user_id
        FROM parent_students
        WHERE student_user_id = ?
        ORDER BY assigned_at
        LIMIT 1
      `,
      [studentUserId]
    );

    const bookingStatus =
      ['tutor', 'manager'].includes(user.role) && BOOKING_STATUSES.includes(String(payload.status || ''))
        ? payload.status
        : 'pending';

    const [result] = await connection.execute(
      `
        INSERT INTO bookings (
          requested_by_user_id,
          tutor_user_id,
          student_user_id,
          parent_user_id,
          booking_date,
          start_time,
          duration_minutes,
          subject,
          exam_board,
          notes,
          attendance_status,
          status,
          approved_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        tutorUserId,
        studentUserId,
        user.role === 'parent' ? user.id : payload.parentUserId || parentRows[0]?.parent_user_id || null,
        payload.bookingDate,
        payload.startTime,
        Number(payload.durationMinutes),
        String(payload.subject).trim(),
        String(payload.examBoard || 'General').trim() || 'General',
        payload.notes?.trim() || null,
        normaliseAttendanceStatus(payload.attendanceStatus),
        bookingStatus,
        bookingStatus === 'confirmed' ? user.id : null
      ]
    );

    await logAction({
      actorUserId: user.id,
      action: 'booking_saved',
      targetType: 'booking',
      targetId: result.insertId,
      details: {
        tutorUserId,
        studentUserId,
        bookingDate: payload.bookingDate,
        status: bookingStatus
      },
      connection
    });

    return result.insertId;
  });
};

const updateBooking = async (user, bookingId, payload) => {
  const booking = await getBookingById(user, bookingId);

  if (!['tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'Only tutors and managers can update bookings');
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);

    if (booking.tutor_user_id !== user.id) {
      throw new ApiError(403, 'You can only update your own bookings');
    }
  }

  if (isPastBookingDate(booking.booking_date)) {
    throw new ApiError(403, 'Past bookings are read-only');
  }

  return withTransaction(async (connection) => {
    await connection.execute(
      `
        UPDATE bookings
        SET subject = ?,
            exam_board = ?,
            duration_minutes = ?,
            notes = ?,
            attendance_status = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [
        String(payload.subject || booking.subject).trim(),
        String(payload.examBoard || booking.exam_board || 'General').trim() || 'General',
        Number(payload.durationMinutes || booking.duration_minutes),
        payload.notes?.trim?.() ?? booking.notes,
        normaliseAttendanceStatus(payload.attendanceStatus || booking.attendance_status),
        bookingId
      ]
    );

    await logAction({
      actorUserId: user.id,
      action: 'booking_updated',
      targetType: 'booking',
      targetId: bookingId,
      details: {
        tutorUserId: booking.tutor_user_id,
        studentUserId: booking.student_user_id
      },
      connection
    });
  });
};

const updateBookingStatus = async (user, bookingId, payload) => {
  const booking = await getBookingById(user, bookingId);

  if (!['tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'Only tutors and managers can update booking status');
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);

    if (booking.tutor_user_id !== user.id) {
      throw new ApiError(403, 'You can only update your own bookings');
    }
  }

  if (!BOOKING_STATUSES.includes(String(payload.status || ''))) {
    throw new ApiError(400, 'A valid booking status is required');
  }

  if (isPastBookingDate(booking.booking_date)) {
    throw new ApiError(403, 'Past bookings are read-only');
  }

  return withTransaction(async (connection) => {
    await connection.execute(
      `
        UPDATE bookings
        SET status = ?,
            decision_notes = ?,
            approved_by_user_id = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [payload.status, payload.decisionNotes || null, user.id, bookingId]
    );

    await logAction({
      actorUserId: user.id,
      action: 'booking_status_updated',
      targetType: 'booking',
      targetId: bookingId,
      details: {
        previousStatus: booking.status,
        newStatus: payload.status
      },
      connection
    });
  });
};

const deleteBooking = async (user, bookingId) => {
  const booking = await getBookingById(user, bookingId);

  if (!['tutor', 'manager'].includes(user.role)) {
    throw new ApiError(403, 'Only tutors and managers can delete bookings');
  }

  if (user.role === 'tutor') {
    ensureApprovedTutor(user);

    if (booking.tutor_user_id !== user.id) {
      throw new ApiError(403, 'You can only delete your own bookings');
    }
  }

  return withTransaction(async (connection) => {
    await connection.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);

    await logAction({
      actorUserId: user.id,
      action: 'booking_deleted',
      targetType: 'booking',
      targetId: bookingId,
      details: {
        tutorUserId: booking.tutor_user_id,
        studentUserId: booking.student_user_id
      },
      connection
    });
  });
};

module.exports = {
  listBookings,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking
};
