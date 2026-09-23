const { query } = require('../db');

const listParents = async (user) => {
  if (user.role === 'tutor') {
    return query(
      `
        SELECT DISTINCT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          COALESCE(users.phone_number, parents.phone) AS phone,
          parents.notes
        FROM parent_students
        INNER JOIN users ON users.id = parent_students.parent_user_id
        LEFT JOIN parents ON parents.user_id = users.id
        WHERE parent_students.student_user_id IN (
          SELECT student_user_id
          FROM tutor_students
          WHERE tutor_user_id = ?
        )
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
          COALESCE(users.phone_number, parents.phone) AS phone,
          parents.notes
        FROM parents
        INNER JOIN users ON users.id = parents.user_id
        WHERE users.id = ?
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
        COALESCE(users.phone_number, parents.phone) AS phone,
        parents.notes
      FROM parents
      INNER JOIN users ON users.id = parents.user_id
      ORDER BY users.full_name
    `
  );
};

module.exports = {
  listParents
};
