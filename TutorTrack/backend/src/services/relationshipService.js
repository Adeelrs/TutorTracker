const { query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { logAction } = require('./auditLogService');

const allowedRelationshipLabels = new Set(['Mother', 'Father', 'Guardian', 'Grandparent', 'Carer']);

const validateUserRole = async (userId, expectedRole) => {
  const rows = await query('SELECT id FROM users WHERE id = ? AND role = ?', [userId, expectedRole]);

  if (!rows[0]) {
    throw new ApiError(400, `User ${userId} is not a ${expectedRole}`);
  }
};

const listTutorStudentLinks = async () => {
  return query(
    `
      SELECT
        tutor_students.id,
        tutor_students.tutor_user_id,
        tutor_students.student_user_id,
        tutor_students.assigned_at,
        tutors_user.full_name AS tutor_name,
        students_user.full_name AS student_name,
        students.year_group,
        students.subject_focus
      FROM tutor_students
      INNER JOIN users AS tutors_user ON tutors_user.id = tutor_students.tutor_user_id
      INNER JOIN users AS students_user ON students_user.id = tutor_students.student_user_id
      LEFT JOIN students ON students.user_id = tutor_students.student_user_id
      ORDER BY tutors_user.full_name, students_user.full_name
    `
  );
};

const createTutorStudentLink = async (actor, tutorUserId, studentUserId) => {
  await validateUserRole(tutorUserId, 'tutor');
  await validateUserRole(studentUserId, 'student');

  return withTransaction(async (connection) => {
    const [existingRows] = await connection.execute(
      'SELECT id FROM tutor_students WHERE tutor_user_id = ? AND student_user_id = ?',
      [tutorUserId, studentUserId]
    );

    if (existingRows[0]) {
      throw new ApiError(409, 'This tutor is already linked to the selected student');
    }

    const [result] = await connection.execute(
      `
        INSERT INTO tutor_students (tutor_user_id, student_user_id, assigned_by_user_id)
        VALUES (?, ?, ?)
      `,
      [tutorUserId, studentUserId, actor.id]
    );

    await logAction({
      actorUserId: actor.id,
      action: 'relationship_assigned',
      targetType: 'tutor_students',
      targetId: result.insertId,
      details: { tutorUserId, studentUserId },
      connection
    });

    return result.insertId;
  });
};

const removeTutorStudentLink = async (actor, relationshipId) => {
  return withTransaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM tutor_students WHERE id = ?', [relationshipId]);

    if (!rows[0]) {
      throw new ApiError(404, 'Tutor-student relationship not found');
    }

    await connection.execute('DELETE FROM tutor_students WHERE id = ?', [relationshipId]);
    await logAction({
      actorUserId: actor.id,
      action: 'relationship_removed',
      targetType: 'tutor_students',
      targetId: relationshipId,
      details: {
        tutorUserId: rows[0].tutor_user_id,
        studentUserId: rows[0].student_user_id
      },
      connection
    });
  });
};

const listParentStudentLinks = async () => {
  return query(
    `
      SELECT
        parent_students.id,
        parent_students.parent_user_id,
        parent_students.student_user_id,
        parent_students.relationship_label,
        parent_students.assigned_at,
        parents_user.full_name AS parent_name,
        students_user.full_name AS student_name,
        students.year_group
      FROM parent_students
      INNER JOIN users AS parents_user ON parents_user.id = parent_students.parent_user_id
      INNER JOIN users AS students_user ON students_user.id = parent_students.student_user_id
      LEFT JOIN students ON students.user_id = parent_students.student_user_id
      ORDER BY parents_user.full_name, students_user.full_name
    `
  );
};

const createParentStudentLink = async (actor, parentUserId, studentUserId, relationshipLabel, tutorUserId) => {
  await validateUserRole(parentUserId, 'parent');
  await validateUserRole(studentUserId, 'student');

  if (!Number.isInteger(Number(tutorUserId)) || Number(tutorUserId) <= 0) {
    throw new ApiError(400, 'Please assign an approved tutor before linking this child');
  }

  await validateUserRole(tutorUserId, 'tutor');

  const normalizedRelationshipLabel = String(relationshipLabel || '').trim();

  if (!allowedRelationshipLabels.has(normalizedRelationshipLabel)) {
    throw new ApiError(400, 'Please choose a valid relationship label');
  }

  return withTransaction(async (connection) => {
    const [tutorRows] = await connection.execute(
      'SELECT approval_status FROM tutors WHERE user_id = ? LIMIT 1',
      [tutorUserId]
    );

    if (!tutorRows[0] || tutorRows[0].approval_status !== 'approved') {
      throw new ApiError(400, 'Please assign an approved tutor before linking this child');
    }

    const [existingRows] = await connection.execute(
      'SELECT id FROM parent_students WHERE parent_user_id = ? AND student_user_id = ?',
      [parentUserId, studentUserId]
    );

    if (existingRows[0]) {
      throw new ApiError(409, 'This parent is already linked to the selected student');
    }

    const [guardianCountRows] = await connection.execute(
      'SELECT COUNT(*) AS guardian_count FROM parent_students WHERE student_user_id = ?',
      [studentUserId]
    );

    if (Number(guardianCountRows[0]?.guardian_count || 0) >= 2) {
      throw new ApiError(400, 'A student can only be linked to up to two guardians');
    }

    const [result] = await connection.execute(
      `
        INSERT INTO parent_students (parent_user_id, student_user_id, relationship_label, assigned_by_user_id)
        VALUES (?, ?, ?, ?)
      `,
      [parentUserId, studentUserId, normalizedRelationshipLabel, actor.id]
    );

    const [existingTutorLinks] = await connection.execute(
      'SELECT id FROM tutor_students WHERE tutor_user_id = ? AND student_user_id = ?',
      [tutorUserId, studentUserId]
    );

    if (!existingTutorLinks[0]) {
      await connection.execute(
        `
          INSERT INTO tutor_students (tutor_user_id, student_user_id, assigned_by_user_id)
          VALUES (?, ?, ?)
        `,
        [tutorUserId, studentUserId, actor.id]
      );
    }

    await logAction({
      actorUserId: actor.id,
      action: 'relationship_assigned',
      targetType: 'parent_students',
      targetId: result.insertId,
      details: { parentUserId, studentUserId, relationshipLabel: normalizedRelationshipLabel, tutorUserId },
      connection
    });

    return result.insertId;
  });
};

const removeParentStudentLink = async (actor, relationshipId) => {
  return withTransaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM parent_students WHERE id = ?', [relationshipId]);

    if (!rows[0]) {
      throw new ApiError(404, 'Parent-student relationship not found');
    }

    await connection.execute('DELETE FROM parent_students WHERE id = ?', [relationshipId]);
    await logAction({
      actorUserId: actor.id,
      action: 'relationship_removed',
      targetType: 'parent_students',
      targetId: relationshipId,
      details: {
        parentUserId: rows[0].parent_user_id,
        studentUserId: rows[0].student_user_id
      },
      connection
    });
  });
};

module.exports = {
  listTutorStudentLinks,
  createTutorStudentLink,
  removeTutorStudentLink,
  listParentStudentLinks,
  createParentStudentLink,
  removeParentStudentLink
};
