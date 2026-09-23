const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { logAction } = require('./auditLogService');
const { getUserByEmail, getUserWithProfile } = require('./userService');
const { ensureRegistrationSchema, generatePlatformUserId } = require('../utils/identity');

const tokenExpiryHours = Number(process.env.TOKEN_EXPIRY_HOURS || 24);
const allowedRoles = new Set(['tutor', 'parent']);
const namePattern = /^[A-Za-z]+(?:[A-Za-z' -]*[A-Za-z])$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordStrengthPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const sanitizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');
const normalizeFullName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const getDefaultManagerUserId = async (connection) => {
  const [rows] = await connection.execute(
    `
      SELECT managers.user_id
      FROM managers
      INNER JOIN users ON users.id = managers.user_id
      WHERE users.account_status = 'active'
      ORDER BY managers.user_id
      LIMIT 1
    `
  );

  return rows[0]?.user_id || null;
};

const createTokenRecord = async (userId, connection) => {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + tokenExpiryHours * 60 * 60 * 1000);

  await connection.execute(
    `
      INSERT INTO auth_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `,
    [userId, token, expiresAt]
  );

  return token;
};

const insertRoleProfile = async (connection, userId, role, payload) => {
  if (role === 'tutor') {
    const managerUserId = await getDefaultManagerUserId(connection);

    await connection.execute(
      `
        INSERT INTO tutors (
          user_id,
          manager_user_id,
          bio,
          specialism,
          stages_taught,
          subjects_taught,
          exam_boards_taught,
          approval_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        userId,
        managerUserId,
        payload.bio || null,
        payload.specialism || payload.subjectsTaught?.[0] || null,
        payload.stagesTaught?.length ? JSON.stringify(payload.stagesTaught) : null,
        payload.subjectsTaught?.length ? JSON.stringify(payload.subjectsTaught) : null,
        payload.examBoardsTaught?.length ? JSON.stringify(payload.examBoardsTaught) : null
      ]
    );
    return;
  }

  if (role === 'student') {
    await connection.execute(
      `
        INSERT INTO students (user_id, year_group, target_grade, subject_focus, notes)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        userId,
        payload.yearGroup || null,
        payload.targetGrade || null,
        payload.subjectFocus || null,
        payload.notes || null
      ]
    );
    return;
  }

  if (role === 'parent') {
    await connection.execute(
      `
        INSERT INTO parents (user_id, phone, notes)
        VALUES (?, ?, ?)
      `,
      [userId, payload.phoneNumber || null, payload.notes || null]
    );
    return;
  }

  if (role === 'manager') {
    await connection.execute(
      `
        INSERT INTO managers (user_id, title)
        VALUES (?, ?)
      `,
      [userId, payload.title || 'Manager']
    );
  }
};

const validateRegisterPayload = (payload) => {
  const role = payload.role === 'guardian' ? 'parent' : payload.role;
  const fullName = normalizeFullName(
    payload.fullName ||
      [payload.firstName, payload.surname].filter(Boolean).join(' ')
  );
  const email = String(payload.email || '').trim().toLowerCase();
  const phoneNumber = sanitizePhoneNumber(payload.phoneNumber || payload.phone || '');
  const password = String(payload.password || '');

  if (!allowedRoles.has(role)) {
    throw new ApiError(400, 'Please choose a valid account type.');
  }

  if (!fullName) {
    throw new ApiError(400, 'Full name is required.');
  }

  if (fullName.length < 2 || fullName.length > 80) {
    throw new ApiError(400, 'Full name must be between 2 and 80 characters.');
  }

  if (!namePattern.test(fullName)) {
    throw new ApiError(400, 'Full name can only use letters, spaces, apostrophes, and hyphens.');
  }

  if (!email) {
    throw new ApiError(400, 'Email is required.');
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  if (phoneNumber.length !== 11) {
    throw new ApiError(400, 'Phone number must contain exactly 11 digits.');
  }

  if (!password) {
    throw new ApiError(400, 'Password is required.');
  }

  if (password.length < 8 || password.length > 64) {
    throw new ApiError(400, 'Password must be between 8 and 64 characters.');
  }

  if (!passwordStrengthPattern.test(password)) {
    throw new ApiError(
      400,
      'Password must include an uppercase letter, a lowercase letter, a number, and a special character.'
    );
  }

  return {
    role,
    fullName,
    email,
    phoneNumber,
    password
  };
};

const register = async (payload) => {
  const validated = validateRegisterPayload(payload);
  const { role, fullName, email, phoneNumber, password } = validated;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await withTransaction(async (connection) => {
    await ensureRegistrationSchema(connection);
    const platformUserId = await generatePlatformUserId(connection);
    const [insertResult] = await connection.execute(
      `
        INSERT INTO users (platform_user_id, full_name, email, phone_number, password_hash, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        platformUserId,
        fullName,
        email,
        phoneNumber,
        passwordHash,
        role
      ]
    );

    const userId = insertResult.insertId;

    await insertRoleProfile(connection, userId, role, {
      ...payload,
      fullName,
      email,
      phoneNumber
    });
    await logAction({
      actorUserId: userId,
      action: 'user_registered',
      targetType: 'user',
      targetId: userId,
      details: { role },
      connection
    });

    const token = await createTokenRecord(userId, connection);

    return { userId, token, platformUserId };
  });

  const user = await getUserWithProfile(result.userId);
  return {
    user,
    token: result.token
  };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await getUserByEmail(email);

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.account_status !== 'active') {
    throw new ApiError(403, 'This account is not active');
  }

  const enrichedUser = await getUserWithProfile(user.id);

  if (enrichedUser.role === 'tutor' && enrichedUser.profile?.approval_status === 'rejected') {
    throw new ApiError(
      403,
      'Your tutor account has been rejected by a manager. You cannot log in. Please contact the centre manager for more information.'
    );
  }

  const result = await withTransaction(async (connection) => {
    const token = await createTokenRecord(user.id, connection);

    await logAction({
      actorUserId: user.id,
      action: 'login',
      targetType: 'user',
      targetId: user.id,
      details: { role: user.role },
      connection
    });

    return { token };
  });

  return {
    user: enrichedUser,
    token: result.token
  };
};

const logout = async (token) => {
  await query('DELETE FROM auth_tokens WHERE token = ?', [token]);
};

const getUserFromToken = async (token) => {
  const rows = await query(
    `
      SELECT auth_tokens.user_id
      FROM auth_tokens
      INNER JOIN users ON users.id = auth_tokens.user_id
      WHERE auth_tokens.token = ?
        AND (auth_tokens.expires_at IS NULL OR auth_tokens.expires_at > NOW())
      LIMIT 1
    `,
    [token]
  );

  if (!rows[0]) {
    return null;
  }

  const user = await getUserWithProfile(rows[0].user_id);

  if (!user || user.account_status !== 'active') {
    await query('DELETE FROM auth_tokens WHERE token = ?', [token]);
    return null;
  }

  if (user.role === 'tutor' && user.profile?.approval_status === 'rejected') {
    await query('DELETE FROM auth_tokens WHERE token = ?', [token]);
    return null;
  }

  return user;
};

module.exports = {
  register,
  login,
  logout,
  getUserFromToken
};
