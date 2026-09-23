const crypto = require('crypto');

const executeQuery = async (executor, sql, params) => {
  if (executor?.execute) {
    const [rows] = await executor.execute(sql, params);
    return rows;
  }

  throw new Error('A database executor with an execute method is required');
};

const hasColumn = async (executor, tableName, columnName) => {
  const rows = await executeQuery(
    executor,
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return Number(rows[0]?.total || 0) > 0;
};

const ensureColumn = async (executor, tableName, columnName, definitionSql) => {
  const columnExists = await hasColumn(executor, tableName, columnName);

  if (!columnExists) {
    await executeQuery(
      executor,
      `ALTER TABLE ${tableName} ADD COLUMN ${definitionSql}`,
      []
    );
  }
};

const ensureRegistrationSchema = async (executor) => {
  await ensureColumn(executor, 'users', 'platform_user_id', 'platform_user_id CHAR(8) NULL UNIQUE AFTER id');
  await ensureColumn(executor, 'users', 'phone_number', 'phone_number VARCHAR(30) NULL AFTER email');
  await ensureColumn(executor, 'tutors', 'stages_taught', 'stages_taught JSON NULL AFTER specialism');
  await ensureColumn(executor, 'tutors', 'subjects_taught', 'subjects_taught JSON NULL AFTER stages_taught');
  await ensureColumn(executor, 'tutors', 'exam_boards_taught', 'exam_boards_taught JSON NULL AFTER subjects_taught');
};

const createRandomPlatformUserId = () => {
  return String(crypto.randomInt(10000000, 100000000));
};

const findUniquePlatformUserId = async (executor) => {
  let platformUserId = '';
  let exists = true;

  while (exists) {
    platformUserId = createRandomPlatformUserId();
    const rows = await executeQuery(
      executor,
      'SELECT id FROM users WHERE platform_user_id = ? LIMIT 1',
      [platformUserId]
    );
    exists = Boolean(rows[0]);
  }

  return platformUserId;
};

const generatePlatformUserId = async (executor) => {
  await ensureRegistrationSchema(executor);
  return findUniquePlatformUserId(executor);
};

const generateTemporaryPassword = () => {
  return crypto.randomBytes(5).toString('base64url');
};

module.exports = {
  ensureRegistrationSchema,
  generatePlatformUserId,
  generateTemporaryPassword
};
