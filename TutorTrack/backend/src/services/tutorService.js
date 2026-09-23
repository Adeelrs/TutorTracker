const { query } = require('../db');
const { parseJsonField } = require('./userService');

const listTutors = async (includeAll = false) => {
  const approvalFilter = includeAll ? '' : "WHERE tutors.approval_status = 'approved'";

  return query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        users.phone_number,
        tutors.bio,
        tutors.specialism,
        tutors.manager_user_id,
        tutors.stages_taught,
        tutors.subjects_taught,
        tutors.exam_boards_taught,
        tutors.approval_status,
        (
          SELECT COUNT(*)
          FROM tutor_students
          WHERE tutor_students.tutor_user_id = users.id
        ) AS assigned_student_count
      FROM tutors
      INNER JOIN users ON users.id = tutors.user_id
      ${approvalFilter}
      ORDER BY users.full_name
    `
  ).then((rows) =>
    rows.map((row) => ({
      ...row,
      stages_taught: parseJsonField(row.stages_taught),
      subjects_taught: parseJsonField(row.subjects_taught),
      exam_boards_taught: parseJsonField(row.exam_boards_taught)
    }))
  );
};

const listAssignedStudents = async (tutorUserId) => {
  return query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        students.year_group,
        students.target_grade,
        students.subject_focus,
        (
          SELECT MAX(session_date)
          FROM sessions
          WHERE sessions.student_user_id = users.id
            AND sessions.tutor_user_id = ?
        ) AS last_session_date
      FROM tutor_students
      INNER JOIN users ON users.id = tutor_students.student_user_id
      LEFT JOIN students ON students.user_id = users.id
      WHERE tutor_students.tutor_user_id = ?
      ORDER BY users.full_name
    `,
    [tutorUserId, tutorUserId]
  );
};

module.exports = {
  listTutors,
  listAssignedStudents
};
