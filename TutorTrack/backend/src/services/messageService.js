const { query, withTransaction } = require('../db');
const ApiError = require('../utils/apiError');
const { logAction } = require('./auditLogService');
const { ensureStudentAccess } = require('./userService');

const getConversation = async (conversationId) => {
  const rows = await query(
    `
      SELECT
        conversations.*,
        user_one.full_name AS participant_one_name,
        user_one.role AS participant_one_role,
        user_two.full_name AS participant_two_name,
        user_two.role AS participant_two_role,
        student.full_name AS student_name
      FROM conversations
      INNER JOIN users AS user_one ON user_one.id = conversations.participant_one_user_id
      INNER JOIN users AS user_two ON user_two.id = conversations.participant_two_user_id
      LEFT JOIN users AS student ON student.id = conversations.student_user_id
      WHERE conversations.id = ?
    `,
    [conversationId]
  );

  return rows[0] || null;
};

const ensureConversationAccess = async (user, conversationId) => {
  const conversation = await getConversation(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant =
    conversation.participant_one_user_id === user.id || conversation.participant_two_user_id === user.id;

  if (!isParticipant && user.role !== 'manager') {
    throw new ApiError(403, 'You do not have access to this conversation');
  }

  if (conversation.student_user_id && user.role === 'parent') {
    await ensureStudentAccess(user, conversation.student_user_id);
  }

  return conversation;
};

const listConversations = async (user, filters = {}) => {
  const params = [user.id];
  let whereClause = '1 = 1';

  if (user.role !== 'manager') {
    whereClause += ' AND (conversations.participant_one_user_id = ? OR conversations.participant_two_user_id = ?)';
    params.push(user.id, user.id);
  }

  if (user.role === 'manager' && filters.participantUserId) {
    whereClause += `
      AND (
        (conversations.participant_one_user_id = ? AND conversations.participant_two_user_id = ?)
        OR
        (conversations.participant_two_user_id = ? AND conversations.participant_one_user_id = ?)
      )
    `;
    params.push(user.id, Number(filters.participantUserId), user.id, Number(filters.participantUserId));
  }

  if (filters.search) {
    whereClause += `
      AND (
        conversations.subject LIKE ?
        OR user_one.full_name LIKE ?
        OR user_two.full_name LIKE ?
      )
    `;
    const likeValue = `%${filters.search}%`;
    params.push(likeValue, likeValue, likeValue);
  }

  return query(
    `
      SELECT
        conversations.*,
        user_one.full_name AS participant_one_name,
        user_one.role AS participant_one_role,
        user_two.full_name AS participant_two_name,
        user_two.role AS participant_two_role,
        student.full_name AS student_name,
        (
          SELECT body
          FROM messages
          WHERE messages.conversation_id = conversations.id
          ORDER BY messages.created_at DESC
          LIMIT 1
        ) AS latest_message,
        (
          SELECT COUNT(*)
          FROM messages
          WHERE messages.conversation_id = conversations.id
            AND messages.recipient_user_id = ?
            AND messages.is_read = 0
        ) AS unread_count
      FROM conversations
      INNER JOIN users AS user_one ON user_one.id = conversations.participant_one_user_id
      INNER JOIN users AS user_two ON user_two.id = conversations.participant_two_user_id
      LEFT JOIN users AS student ON student.id = conversations.student_user_id
      WHERE ${whereClause}
      ORDER BY conversations.last_message_at DESC, conversations.created_at DESC
    `,
    params
  );
};

const getConversationMessages = async (user, conversationId) => {
  const conversation = await ensureConversationAccess(user, conversationId);

  const messages = await query(
    `
      SELECT
        messages.*,
        sender.full_name AS sender_name,
        sender.role AS sender_role,
        recipient.full_name AS recipient_name,
        recipient.role AS recipient_role
      FROM messages
      INNER JOIN users AS sender ON sender.id = messages.sender_user_id
      INNER JOIN users AS recipient ON recipient.id = messages.recipient_user_id
      WHERE messages.conversation_id = ?
      ORDER BY messages.created_at ASC
    `,
    [conversationId]
  );

  return {
    conversation,
    messages
  };
};

const createConversation = async (user, payload) => {
  if (!payload.recipientUserId || !payload.subject || !payload.initialMessage) {
    throw new ApiError(400, 'recipientUserId, subject, and initialMessage are required');
  }

  const recipientUserId = Number(payload.recipientUserId);
  if (recipientUserId === user.id) {
    throw new ApiError(400, 'You cannot create a conversation with yourself');
  }

  if (payload.studentUserId && user.role === 'parent') {
    await ensureStudentAccess(user, payload.studentUserId);
  }

  return withTransaction(async (connection) => {
    const [conversationResult] = await connection.execute(
      `
        INSERT INTO conversations (
          subject,
          participant_one_user_id,
          participant_two_user_id,
          student_user_id,
          created_by_user_id,
          last_message_at
        )
        VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [
        payload.subject,
        user.id,
        recipientUserId,
        payload.studentUserId || null,
        user.id
      ]
    );

    await connection.execute(
      `
        INSERT INTO messages (conversation_id, sender_user_id, recipient_user_id, body, is_read)
        VALUES (?, ?, ?, ?, 0)
      `,
      [conversationResult.insertId, user.id, recipientUserId, payload.initialMessage]
    );

    await logAction({
      actorUserId: user.id,
      action: 'conversation_created',
      targetType: 'conversation',
      targetId: conversationResult.insertId,
      details: { recipientUserId, subject: payload.subject },
      connection
    });

    return conversationResult.insertId;
  });
};

const sendMessage = async (user, conversationId, body) => {
  if (!body) {
    throw new ApiError(400, 'Message body is required');
  }

  const conversation = await ensureConversationAccess(user, conversationId);
  const recipientUserId =
    conversation.participant_one_user_id === user.id
      ? conversation.participant_two_user_id
      : conversation.participant_one_user_id;

  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `
        INSERT INTO messages (conversation_id, sender_user_id, recipient_user_id, body, is_read)
        VALUES (?, ?, ?, ?, 0)
      `,
      [conversationId, user.id, recipientUserId, body]
    );

    await connection.execute(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
      [conversationId]
    );

    await logAction({
      actorUserId: user.id,
      action: 'message_sent',
      targetType: 'message',
      targetId: result.insertId,
      details: { conversationId, recipientUserId },
      connection
    });

    return result.insertId;
  });
};

const markConversationAsRead = async (user, conversationId) => {
  await ensureConversationAccess(user, conversationId);

  await query(
    `
      UPDATE messages
      SET is_read = 1
      WHERE conversation_id = ?
        AND recipient_user_id = ?
    `,
    [conversationId, user.id]
  );
};

module.exports = {
  listConversations,
  getConversationMessages,
  createConversation,
  sendMessage,
  markConversationAsRead
};
