const bcrypt = require('bcrypt');
const { pool, query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { logAction } = require('./auditLogService');
const { ensureRegistrationSchema, generatePlatformUserId, generateTemporaryPassword } = require('../utils/identity');

const seededPhoneNumbersByEmail = {
  'manager@tutortrack.local': '07000 100001',
  'tutor.aisha@tutortrack.local': '07000 100002',
  'tutor.daniel@tutortrack.local': '07000 100003',
  'parent.sana@tutortrack.local': '07111 222333',
  'parent.michael@tutortrack.local': '07222 333444'
};

const allowedYearGroups = new Set([
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
  'Year 13'
]);

const allowedSubjectFocuses = new Set([
  'Mathematics',
  'English',
  'Biology',
  'Chemistry',
  'Physics',
  'Combined Science',
  'History',
  'Geography',
  'Computer Science',
  'Business Studies'
]);

const namePattern = /^[A-Za-z]+(?:[A-Za-z' -]*[A-Za-z])$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value) => String(value || '').trim();
const sanitizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');

const validateStudentCreationPayload = (payload) => {
  const fullName = normalizeText(payload.fullName);
  const email = normalizeText(payload.email).toLowerCase();
  const yearGroup = normalizeText(payload.yearGroup);
  const subjectFocus = normalizeText(payload.subjectFocus);

  if (!fullName || !namePattern.test(fullName) || !/[A-Za-z]/.test(fullName.replace(/[^A-Za-z]/g, ''))) {
    throw new ApiError(400, 'Please enter a valid student full name');
  }

  if (!email || !emailPattern.test(email)) {
    throw new ApiError(400, 'Please enter a valid student email address');
  }

  if (!allowedYearGroups.has(yearGroup)) {
    throw new ApiError(400, 'Please choose a valid year group');
  }

  if (!allowedSubjectFocuses.has(subjectFocus)) {
    throw new ApiError(400, 'Please choose a valid subject focus');
  }

  return {
    fullName,
    email,
    yearGroup,
    subjectFocus
  };
};

const splitListField = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return [];
  }

  if (text.includes('|')) {
    return text.split('|').map((item) => item.trim()).filter(Boolean);
  }

  if (text.includes(';')) {
    return text.split(';').map((item) => item.trim()).filter(Boolean);
  }

  if (text.includes(',')) {
    return text.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [text];
};

const parseJsonField = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (typeof parsed === 'string') {
        return splitListField(parsed);
      }

      return [];
    } catch (error) {
      return splitListField(value);
    }
  }

  return [];
};

const normalizeTutorProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    stages_taught: parseJsonField(profile.stages_taught),
    subjects_taught: parseJsonField(profile.subjects_taught),
    exam_boards_taught: parseJsonField(profile.exam_boards_taught)
  };
};

const getRoleProfile = async (userId, role) => {
  const tableMap = {
    tutor: 'tutors',
    student: 'students',
    parent: 'parents',
    manager: 'managers'
  };

  const tableName = tableMap[role];

  if (!tableName) {
    return null;
  }

  const rows = await query(`SELECT * FROM ${tableName} WHERE user_id = ?`, [userId]);
  const profile = rows[0] || null;

  return role === 'tutor' ? normalizeTutorProfile(profile) : profile;
};

const getUserById = async (userId) => {
  const rows = await query('SELECT * FROM users WHERE id = ?', [userId]);
  return rows[0] || null;
};

const getUserByEmail = async (email) => {
  const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

const getLegacyParentPhone = async (userId) => {
  const rows = await query('SELECT phone FROM parents WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0]?.phone || null;
};

const ensureUserIdentityFields = async (user) => {
  if (!user) {
    return null;
  }

  await ensureRegistrationSchema(pool);

  let nextPlatformUserId = user.platform_user_id;
  let nextPhoneNumber = user.phone_number;

  if (!nextPlatformUserId) {
    nextPlatformUserId = await generatePlatformUserId(pool);
  }

  if (!nextPhoneNumber) {
    nextPhoneNumber =
      seededPhoneNumbersByEmail[user.email?.toLowerCase()] ||
      (user.role === 'parent' ? await getLegacyParentPhone(user.id) : null);
  }

  if (
    nextPlatformUserId !== user.platform_user_id ||
    nextPhoneNumber !== user.phone_number
  ) {
    await query(
      `
        UPDATE users
        SET platform_user_id = COALESCE(?, platform_user_id),
            phone_number = CASE WHEN ? IS NULL THEN phone_number ELSE ? END
        WHERE id = ?
      `,
      [nextPlatformUserId || null, nextPhoneNumber, nextPhoneNumber, user.id]
    );

    return {
      ...user,
      platform_user_id: nextPlatformUserId,
      phone_number: nextPhoneNumber
    };
  }

  return user;
};

const getUserWithProfile = async (userId) => {
  const existingUser = await getUserById(userId);

  const user = await ensureUserIdentityFields(existingUser);

  if (!user) {
    return null;
  }

  const profile = await getRoleProfile(user.id, user.role);

  return {
    ...user,
    profile
  };
};

const getAccessibleStudentIds = async (user) => {
  if (user.role === 'manager') {
    const students = await query('SELECT user_id FROM students');
    return students.map((student) => student.user_id);
  }

  if (user.role === 'student') {
    return [user.id];
  }

  if (user.role === 'tutor') {
    const rows = await query(
      'SELECT student_user_id FROM tutor_students WHERE tutor_user_id = ?',
      [user.id]
    );
    return rows.map((row) => row.student_user_id);
  }

  if (user.role === 'parent') {
    const rows = await query(
      'SELECT student_user_id FROM parent_students WHERE parent_user_id = ?',
      [user.id]
    );
    return rows.map((row) => row.student_user_id);
  }

  return [];
};

const ensureStudentAccess = async (user, studentUserId) => {
  const accessibleStudentIds = await getAccessibleStudentIds(user);

  if (!accessibleStudentIds.includes(Number(studentUserId))) {
    throw new ApiError(403, 'You do not have access to this student record');
  }
};

const getLinkedGuardians = async (studentUserId) => {
  return query(
    `
      SELECT
        parent_students.id,
        parent_students.relationship_label,
        users.id AS user_id,
        users.platform_user_id,
        users.full_name,
        users.email,
        COALESCE(users.phone_number, parents.phone) AS phone_number
      FROM parent_students
      INNER JOIN users ON users.id = parent_students.parent_user_id
      LEFT JOIN parents ON parents.user_id = users.id
      WHERE parent_students.student_user_id = ?
      ORDER BY users.full_name
    `,
    [studentUserId]
  );
};

const getLinkedChildren = async (parentUserId) => {
  return query(
    `
      SELECT
        parent_students.id,
        parent_students.relationship_label,
        users.id AS user_id,
        users.platform_user_id,
        users.full_name,
        users.email,
        students.year_group,
        students.target_grade,
        students.subject_focus,
        students.notes
      FROM parent_students
      INNER JOIN users ON users.id = parent_students.student_user_id
      LEFT JOIN students ON students.user_id = users.id
      WHERE parent_students.parent_user_id = ?
      ORDER BY users.full_name
    `,
    [parentUserId]
  );
};

const getAssignedManager = async (tutorUserId) => {
  const rows = await query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        managers.title
      FROM tutors
      INNER JOIN users ON users.id = tutors.manager_user_id
      LEFT JOIN managers ON managers.user_id = users.id
      WHERE tutors.user_id = ?
      LIMIT 1
    `,
    [tutorUserId]
  );

  if (rows[0]) {
    return rows[0];
  }

  const fallbackRows = await query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        managers.title
      FROM managers
      INNER JOIN users ON users.id = managers.user_id
      WHERE users.account_status = 'active'
      ORDER BY managers.user_id
      LIMIT 1
    `
  );

  return fallbackRows[0] || null;
};

const getAssignedTutorsForStudent = async (studentUserId) => {
  return query(
    `
      SELECT
        users.id AS user_id,
        users.platform_user_id,
        users.full_name,
        users.email,
        users.phone_number,
        tutors.specialism,
        tutors.approval_status
      FROM tutor_students
      INNER JOIN users ON users.id = tutor_students.tutor_user_id
      LEFT JOIN tutors ON tutors.user_id = users.id
      WHERE tutor_students.student_user_id = ?
      ORDER BY users.full_name
    `,
    [studentUserId]
  );
};

const getAssignedStudentsForTutor = async (tutorUserId) => {
  return query(
    `
      SELECT
        users.id AS user_id,
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
    [tutorUserId]
  );
};

const listMessageDirectory = async (user) => {
  const managers = await query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        users.phone_number,
        users.role,
        managers.title
      FROM users
      INNER JOIN managers ON managers.user_id = users.id
      WHERE users.account_status = 'active'
      ORDER BY users.full_name
    `
  );

  if (user.role === 'student') {
    const tutors = await query(
      `
        SELECT DISTINCT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          users.phone_number,
          users.role,
          tutors.specialism
        FROM tutor_students
        INNER JOIN users ON users.id = tutor_students.tutor_user_id
        LEFT JOIN tutors ON tutors.user_id = users.id
        WHERE tutor_students.student_user_id = ?
          AND tutors.approval_status = 'approved'
        ORDER BY users.full_name
      `,
      [user.id]
    );

    return [...tutors, ...managers];
  }

  if (user.role === 'parent') {
    const tutors = await query(
      `
        SELECT DISTINCT
          users.id,
          users.platform_user_id,
          users.full_name,
          users.email,
          users.phone_number,
          users.role,
          tutors.specialism
        FROM parent_students
        INNER JOIN tutor_students
          ON tutor_students.student_user_id = parent_students.student_user_id
        INNER JOIN users ON users.id = tutor_students.tutor_user_id
        LEFT JOIN tutors ON tutors.user_id = users.id
        WHERE parent_students.parent_user_id = ?
          AND tutors.approval_status = 'approved'
        ORDER BY users.full_name
      `,
      [user.id]
    );

    return [...tutors, ...managers];
  }

  return [];
};

const getUserProfileBundle = async (userId) => {
  const user = await getUserWithProfile(userId);

  if (!user) {
    return null;
  }

  const profileData = {
    ...user,
    linkedGuardians: [],
    linkedChildren: [],
    assignedManager: null
  };

  if (user.role === 'student') {
    profileData.linkedGuardians = await getLinkedGuardians(user.id);
  }

  if (user.role === 'parent') {
    profileData.linkedChildren = await getLinkedChildren(user.id);
  }

  if (user.role === 'tutor') {
    profileData.assignedManager = await getAssignedManager(user.id);
  }

  return profileData;
};

const listUsers = async (filters = {}) => {
  const params = [];
  const whereParts = ['1 = 1'];

  if (filters.role) {
    whereParts.push('users.role = ?');
    params.push(filters.role);
  }

  if (filters.status) {
    whereParts.push(`
      (
        users.account_status = ?
        OR tutors.approval_status = ?
      )
    `);
    params.push(filters.status, filters.status);
  }

  if (filters.search) {
    whereParts.push(`
      (
        users.full_name LIKE ?
        OR users.email LIKE ?
        OR users.platform_user_id LIKE ?
        OR tutors.specialism LIKE ?
      )
    `);
    const likeValue = `%${filters.search}%`;
    params.push(likeValue, likeValue, likeValue, likeValue);
  }

  return query(
    `
      SELECT
        users.id,
        users.platform_user_id,
        users.full_name,
        users.email,
        users.phone_number,
        users.role,
        users.account_status,
        users.created_at,
        tutors.specialism,
        tutors.approval_status,
        tutors.manager_user_id,
        students.year_group,
        students.target_grade,
        students.subject_focus,
        parents.phone,
        managers.title,
        CASE
          WHEN users.role = 'tutor' THEN tutors.approval_status
          ELSE users.account_status
        END AS display_status
      FROM users
      LEFT JOIN tutors ON tutors.user_id = users.id
      LEFT JOIN students ON students.user_id = users.id
      LEFT JOIN parents ON parents.user_id = users.id
      LEFT JOIN managers ON managers.user_id = users.id
      WHERE ${whereParts.join(' AND ')}
      ORDER BY users.role, users.full_name
    `,
    params
  );
};

const updateOwnProfile = async (user, payload) => {
  const {
    displayName,
    fullName,
    phoneNumber,
    phone,
    notes,
    bio,
    specialism,
    yearGroup,
    targetGrade,
    subjectFocus,
    title,
    stagesTaught,
    subjectsTaught,
    examBoardsTaught
  } = payload;

  const nextName = displayName || fullName;
  const rawPhone = phoneNumber ?? phone ?? null;
  const nextPhone = rawPhone === null ? null : sanitizePhoneNumber(rawPhone);

  if (nextName || nextPhone !== null) {
    await query(
      `
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            phone_number = CASE WHEN ? IS NULL THEN phone_number ELSE ? END
        WHERE id = ?
      `,
      [nextName || null, nextPhone, nextPhone, user.id]
    );
  }

  if (user.role === 'parent') {
    await query(
      `
        UPDATE parents
        SET phone = CASE WHEN ? IS NULL THEN phone ELSE ? END,
            notes = COALESCE(?, notes)
        WHERE user_id = ?
      `,
      [nextPhone, nextPhone, notes || null, user.id]
    );
  }

  if (user.role === 'tutor') {
    await query(
      `
        UPDATE tutors
        SET bio = COALESCE(?, bio),
            specialism = COALESCE(?, specialism),
            stages_taught = CASE WHEN ? IS NULL THEN stages_taught ELSE ? END,
            subjects_taught = CASE WHEN ? IS NULL THEN subjects_taught ELSE ? END,
            exam_boards_taught = CASE WHEN ? IS NULL THEN exam_boards_taught ELSE ? END
        WHERE user_id = ?
      `,
      [
        bio || null,
        specialism || null,
        Array.isArray(stagesTaught) ? JSON.stringify(stagesTaught) : null,
        Array.isArray(stagesTaught) ? JSON.stringify(stagesTaught) : null,
        Array.isArray(subjectsTaught) ? JSON.stringify(subjectsTaught) : null,
        Array.isArray(subjectsTaught) ? JSON.stringify(subjectsTaught) : null,
        Array.isArray(examBoardsTaught) ? JSON.stringify(examBoardsTaught) : null,
        Array.isArray(examBoardsTaught) ? JSON.stringify(examBoardsTaught) : null,
        user.id
      ]
    );
  }

  if (user.role === 'student') {
    await query(
      `
        UPDATE students
        SET year_group = COALESCE(?, year_group),
            target_grade = COALESCE(?, target_grade),
            subject_focus = COALESCE(?, subject_focus),
            notes = COALESCE(?, notes)
        WHERE user_id = ?
      `,
      [yearGroup || null, targetGrade || null, subjectFocus || null, notes || null, user.id]
    );
  }

  if (user.role === 'manager') {
    await query(
      'UPDATE managers SET title = COALESCE(?, title) WHERE user_id = ?',
      [title || null, user.id]
    );
  }

  return getUserProfileBundle(user.id);
};

const updateUserAsManager = async (userId, payload) => {
  const targetUser = await getUserById(userId);

  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  const {
    displayName,
    fullName,
    email,
    phoneNumber,
    phone,
    accountStatus,
    notes,
    bio,
    specialism,
    yearGroup,
    targetGrade,
    subjectFocus,
    title,
    stagesTaught,
    subjectsTaught,
    examBoardsTaught
  } = payload;

  const nextName = displayName || fullName || null;
  const rawPhone = phoneNumber ?? phone ?? null;
  const nextPhone = rawPhone === null ? null : sanitizePhoneNumber(rawPhone);
  const nextEmail = email?.trim?.().toLowerCase?.() || null;

  if (nextEmail && nextEmail !== targetUser.email) {
    const existingUser = await getUserByEmail(nextEmail);

    if (existingUser && existingUser.id !== targetUser.id) {
      throw new ApiError(409, 'An account with this email already exists');
    }
  }

  await query(
    `
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          phone_number = CASE WHEN ? IS NULL THEN phone_number ELSE ? END,
          account_status = COALESCE(?, account_status)
      WHERE id = ?
    `,
    [nextName, nextEmail, nextPhone, nextPhone, accountStatus || null, userId]
  );

  if (targetUser.role === 'parent') {
    await query(
      `
        UPDATE parents
        SET phone = CASE WHEN ? IS NULL THEN phone ELSE ? END,
            notes = COALESCE(?, notes)
        WHERE user_id = ?
      `,
      [nextPhone, nextPhone, notes || null, userId]
    );
  }

  if (targetUser.role === 'tutor') {
    await query(
      `
        UPDATE tutors
        SET bio = COALESCE(?, bio),
            specialism = COALESCE(?, specialism),
            stages_taught = CASE WHEN ? IS NULL THEN stages_taught ELSE ? END,
            subjects_taught = CASE WHEN ? IS NULL THEN subjects_taught ELSE ? END,
            exam_boards_taught = CASE WHEN ? IS NULL THEN exam_boards_taught ELSE ? END
        WHERE user_id = ?
      `,
      [
        bio || null,
        specialism || null,
        Array.isArray(stagesTaught) ? JSON.stringify(stagesTaught) : null,
        Array.isArray(stagesTaught) ? JSON.stringify(stagesTaught) : null,
        Array.isArray(subjectsTaught) ? JSON.stringify(subjectsTaught) : null,
        Array.isArray(subjectsTaught) ? JSON.stringify(subjectsTaught) : null,
        Array.isArray(examBoardsTaught) ? JSON.stringify(examBoardsTaught) : null,
        Array.isArray(examBoardsTaught) ? JSON.stringify(examBoardsTaught) : null,
        userId
      ]
    );
  }

  if (targetUser.role === 'student') {
    await query(
      `
        UPDATE students
        SET year_group = COALESCE(?, year_group),
            target_grade = COALESCE(?, target_grade),
            subject_focus = COALESCE(?, subject_focus),
            notes = COALESCE(?, notes)
        WHERE user_id = ?
      `,
      [yearGroup || null, targetGrade || null, subjectFocus || null, notes || null, userId]
    );
  }

  if (targetUser.role === 'manager') {
    await query(
      `
        UPDATE managers
        SET title = COALESCE(?, title)
        WHERE user_id = ?
      `,
      [title || null, userId]
    );
  }

  return getUserDetailForManager(userId);
};

const deleteUserAsManager = async (managerUser, userId) => {
  if (managerUser.role !== 'manager') {
    throw new ApiError(403, 'Only managers can delete users from this page');
  }

  const targetUser = await getUserById(userId);

  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  if (targetUser.role !== 'student') {
    throw new ApiError(400, 'Only student accounts can be deleted from this section');
  }

  if (targetUser.id === managerUser.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  await withTransaction(async (connection) => {
    await logAction({
      actorUserId: managerUser.id,
      action: 'student_deleted',
      targetType: 'student',
      targetId: targetUser.id,
      details: {
        studentEmail: targetUser.email,
        studentName: targetUser.full_name
      },
      connection
    });

    await connection.execute('DELETE FROM users WHERE id = ? AND role = ?', [targetUser.id, 'student']);
  });
};

const changePassword = async (userId, payload) => {
  const { currentPassword, newPassword } = payload;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters long');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
};

const createChildAccount = async (parentUser, payload) => {
  if (parentUser.role !== 'parent') {
    throw new ApiError(403, 'Only guardians can register a child from this page');
  }

  const email = payload.email?.trim().toLowerCase();
  const fullName = [payload.firstName, payload.surname].filter(Boolean).join(' ').trim();

  if (!fullName || !email) {
    throw new ApiError(400, 'Child first name, surname, and email are required');
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'An account with this child email already exists');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  return withTransaction(async (connection) => {
    await ensureRegistrationSchema(connection);
    const platformUserId = await generatePlatformUserId(connection);
    const [userResult] = await connection.execute(
      `
        INSERT INTO users (platform_user_id, full_name, email, password_hash, role)
        VALUES (?, ?, ?, ?, 'student')
      `,
      [platformUserId, fullName, email, passwordHash]
    );

    await connection.execute(
      `
        INSERT INTO students (user_id, year_group, target_grade, subject_focus, notes)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        userResult.insertId,
        payload.yearGroup || null,
        payload.targetGrade || null,
        payload.subjectFocus || null,
        payload.notes || null
      ]
    );

    await connection.execute(
      `
        INSERT INTO parent_students (parent_user_id, student_user_id, relationship_label, assigned_by_user_id)
        VALUES (?, ?, ?, ?)
      `,
      [parentUser.id, userResult.insertId, payload.relationshipLabel || 'Guardian', parentUser.id]
    );

    await logAction({
      actorUserId: parentUser.id,
      action: 'child_registered',
      targetType: 'student',
      targetId: userResult.insertId,
      details: {
        parentUserId: parentUser.id,
        childEmail: email
      },
      connection
    });

    const childUser = await getUserProfileBundle(userResult.insertId);

    return {
      childUser,
      temporaryPassword
    };
  });
};

const createStudentAsManager = async (managerUser, payload) => {
  if (managerUser.role !== 'manager') {
    throw new ApiError(403, 'Only managers can create a student from this page');
  }

  const {
    fullName,
    email,
    yearGroup,
    subjectFocus
  } = validateStudentCreationPayload(payload);

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'An account with this student email already exists');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  let createdUserId = null;

  await withTransaction(async (connection) => {
    await ensureRegistrationSchema(connection);
    const platformUserId = await generatePlatformUserId(connection);
    const [userResult] = await connection.execute(
      `
        INSERT INTO users (platform_user_id, full_name, email, password_hash, role, account_status)
        VALUES (?, ?, ?, ?, 'student', 'active')
      `,
      [platformUserId, fullName, email, passwordHash]
    );

    createdUserId = userResult.insertId;

    await connection.execute(
      `
        INSERT INTO students (user_id, year_group, target_grade, subject_focus, notes)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        createdUserId,
        yearGroup,
        payload.targetGrade || null,
        subjectFocus,
        payload.notes || null
      ]
    );

    await logAction({
      actorUserId: managerUser.id,
      action: 'student_created',
      targetType: 'student',
      targetId: createdUserId,
      details: {
        studentEmail: email,
        yearGroup,
        subjectFocus
      },
      connection
    });
  });

  const studentUser = await getUserProfileBundle(createdUserId);

  return {
    studentUser,
    temporaryPassword
  };
};

const getUserDetailForManager = async (userId) => {
  const user = await getUserProfileBundle(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === 'tutor') {
    const [assignedStudents, managerInfo, bookings, sessions] = await Promise.all([
      getAssignedStudentsForTutor(user.id),
      getAssignedManager(user.id),
      query(
        `
          SELECT
            bookings.*,
            student.full_name AS student_name,
            student.platform_user_id AS student_platform_user_id,
            parent.full_name AS parent_name
          FROM bookings
          INNER JOIN users AS student ON student.id = bookings.student_user_id
          LEFT JOIN users AS parent ON parent.id = bookings.parent_user_id
          WHERE bookings.tutor_user_id = ?
          ORDER BY bookings.booking_date DESC, bookings.start_time DESC
          LIMIT 24
        `,
        [user.id]
      ),
      query(
        `
          SELECT
            sessions.*,
            student.full_name AS student_name,
            student.platform_user_id AS student_platform_user_id
          FROM sessions
          INNER JOIN users AS student ON student.id = sessions.student_user_id
          WHERE sessions.tutor_user_id = ?
          ORDER BY sessions.session_date DESC
          LIMIT 24
        `,
        [user.id]
      )
    ]);

    return {
      ...user,
      ...(user.profile || {}),
      assignedStudents,
      managerInfo,
      bookings,
      sessions
    };
  }

  if (user.role === 'student') {
    const [guardians, tutors, sessions, bookings] = await Promise.all([
      getLinkedGuardians(user.id),
      getAssignedTutorsForStudent(user.id),
      query(
        `
          SELECT
            sessions.*,
            tutor.full_name AS tutor_name,
            bookings.subject AS booking_subject,
            bookings.exam_board AS booking_exam_board
          FROM sessions
          INNER JOIN users AS tutor ON tutor.id = sessions.tutor_user_id
          LEFT JOIN bookings ON bookings.id = sessions.booking_id
          WHERE sessions.student_user_id = ?
          ORDER BY sessions.session_date DESC
          LIMIT 24
        `,
        [user.id]
      ),
      query(
        `
          SELECT
            bookings.*,
            tutor.full_name AS tutor_name,
            parent.full_name AS parent_name
          FROM bookings
          INNER JOIN users AS tutor ON tutor.id = bookings.tutor_user_id
          LEFT JOIN users AS parent ON parent.id = bookings.parent_user_id
          WHERE bookings.student_user_id = ?
          ORDER BY bookings.booking_date DESC, bookings.start_time DESC
          LIMIT 24
        `,
        [user.id]
      )
    ]);

    return {
      ...user,
      ...(user.profile || {}),
      guardians,
      tutors,
      sessions,
      bookings
    };
  }

  if (user.role === 'parent') {
    const [linkedChildren, tutorLinks, conversations] = await Promise.all([
      getLinkedChildren(user.id),
      query(
        `
          SELECT DISTINCT
            users.id AS tutor_user_id,
            users.full_name AS tutor_name,
            tutors.specialism,
            students_user.full_name AS student_name
          FROM parent_students
          INNER JOIN tutor_students
            ON tutor_students.student_user_id = parent_students.student_user_id
          INNER JOIN users
            ON users.id = tutor_students.tutor_user_id
          LEFT JOIN tutors
            ON tutors.user_id = users.id
          INNER JOIN users AS students_user
            ON students_user.id = parent_students.student_user_id
          WHERE parent_students.parent_user_id = ?
          ORDER BY tutor_name, student_name
        `,
        [user.id]
      ),
      query(
        `
          SELECT
            conversations.id,
            conversations.subject,
            conversations.last_message_at
          FROM conversations
          WHERE conversations.participant_one_user_id = ?
             OR conversations.participant_two_user_id = ?
          ORDER BY conversations.last_message_at DESC, conversations.created_at DESC
          LIMIT 24
        `,
        [user.id, user.id]
      )
    ]);

    return {
      ...user,
      ...(user.profile || {}),
      linkedChildren,
      tutorLinks,
      conversations
    };
  }

  return {
    ...user,
    ...(user.profile || {})
  };
};

module.exports = {
  getUserByEmail,
  getUserById,
  getUserWithProfile,
  getRoleProfile,
  getAccessibleStudentIds,
  ensureStudentAccess,
  listUsers,
  updateOwnProfile,
  updateUserAsManager,
  deleteUserAsManager,
  changePassword,
  getUserProfileBundle,
  createChildAccount,
  createStudentAsManager,
  getUserDetailForManager,
  getLinkedChildren,
  getLinkedGuardians,
  getAssignedManager,
  listMessageDirectory,
  parseJsonField
};
