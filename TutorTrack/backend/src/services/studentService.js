const { query } = require('../db');
const { ensureStudentAccess } = require('./userService');

const listStudents = async (user) => {
  if (user.role === 'manager') {
    return query(
      `
        SELECT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          students.year_group,
          students.target_grade,
          students.subject_focus
        FROM students
        INNER JOIN users ON users.id = students.user_id
        ORDER BY users.full_name
      `
    );
  }

  if (user.role === 'tutor') {
    return query(
      `
        SELECT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          students.year_group,
          students.target_grade,
          students.subject_focus
        FROM tutor_students
        INNER JOIN users ON users.id = tutor_students.student_user_id
        LEFT JOIN students ON students.user_id = users.id
        WHERE tutor_students.tutor_user_id = ?
        ORDER BY users.full_name
      `,
      [user.id]
    );
  }

  if (user.role === 'parent') {
    return query(
      `
        SELECT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          students.year_group,
          students.target_grade,
          students.subject_focus
        FROM parent_students
        INNER JOIN users ON users.id = parent_students.student_user_id
        LEFT JOIN students ON students.user_id = users.id
        WHERE parent_students.parent_user_id = ?
        ORDER BY users.full_name
      `,
      [user.id]
    );
  }

  return query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        students.year_group,
        students.target_grade,
        students.subject_focus
      FROM students
      INNER JOIN users ON users.id = students.user_id
      WHERE users.id = ?
    `,
    [user.id]
  );
};

const getStudentDashboard = async (user, studentUserId = null) => {
  const targetStudentId = studentUserId ? Number(studentUserId) : user.id;

  if (user.role !== 'manager') {
    await ensureStudentAccess(user, targetStudentId);
  }

  const [studentRows, guardians, tutors] = await Promise.all([
    query(
      `
        SELECT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          students.year_group,
          students.target_grade,
          students.subject_focus
        FROM users
        INNER JOIN students ON students.user_id = users.id
        WHERE users.id = ?
        LIMIT 1
      `,
      [targetStudentId]
    ),
    query(
      `
        SELECT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          COALESCE(users.phone_number, parents.phone) AS phone_number,
          parent_students.relationship_label
        FROM parent_students
        INNER JOIN users ON users.id = parent_students.parent_user_id
        LEFT JOIN parents ON parents.user_id = users.id
        WHERE parent_students.student_user_id = ?
        ORDER BY parent_students.assigned_at, users.full_name
      `,
      [targetStudentId]
    ),
    query(
      `
        SELECT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          tutors.specialism,
          tutors.approval_status
        FROM tutor_students
        INNER JOIN users ON users.id = tutor_students.tutor_user_id
        LEFT JOIN tutors ON tutors.user_id = users.id
        WHERE tutor_students.student_user_id = ?
        ORDER BY users.full_name
      `,
      [targetStudentId]
    )
  ]);

  return {
    student: studentRows[0] || null,
    guardians,
    tutors
  };
};

module.exports = {
  listStudents,
  getStudentDashboard
};
