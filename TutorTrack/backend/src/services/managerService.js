const { query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { logAction } = require('./auditLogService');
const { parseJsonField } = require('./userService');

const listTutorApprovals = async () => {
  const rows = await query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        users.phone_number,
        tutors.bio,
        tutors.specialism,
        tutors.stages_taught,
        tutors.subjects_taught,
        tutors.exam_boards_taught,
        tutors.approval_status,
        tutors.approval_notes,
        tutors.created_at
      FROM tutors
      INNER JOIN users ON users.id = tutors.user_id
      ORDER BY tutors.approval_status, tutors.created_at DESC
    `
  );

  return rows.map((row) => ({
    ...row,
    stages_taught: parseJsonField(row.stages_taught),
    subjects_taught: parseJsonField(row.subjects_taught),
    exam_boards_taught: parseJsonField(row.exam_boards_taught)
  }));
};

const updateTutorApproval = async (managerUserId, tutorUserId, payload) => {
  if (!['approved', 'rejected', 'pending'].includes(payload.approvalStatus)) {
    throw new ApiError(400, 'approvalStatus must be approved, rejected, or pending');
  }

  return withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `
        SELECT approval_status
        FROM tutors
        WHERE user_id = ?
      `,
      [tutorUserId]
    );

    if (!rows[0]) {
      throw new ApiError(404, 'Tutor profile not found');
    }

    await connection.execute(
      `
        UPDATE tutors
        SET approval_status = ?,
            approval_notes = ?,
            manager_user_id = ?,
            approved_by_user_id = ?,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE user_id = ?
      `,
      [payload.approvalStatus, payload.approvalNotes || null, managerUserId, managerUserId, tutorUserId]
    );

    if (payload.approvalStatus === 'rejected') {
      await connection.execute('DELETE FROM auth_tokens WHERE user_id = ?', [tutorUserId]);
    }

    await logAction({
      actorUserId: managerUserId,
      action: 'tutor_approval_updated',
      targetType: 'tutor',
      targetId: tutorUserId,
      details: {
        previousStatus: rows[0].approval_status,
        newStatus: payload.approvalStatus
      },
      connection
    });
  });
};

module.exports = {
  listTutorApprovals,
  updateTutorApproval
};
