const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const messageService = require('../services/messageService');

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await messageService.listConversations(req.user, req.query);
  sendSuccess(res, conversations, 'Conversations loaded');
});

const getConversationMessages = asyncHandler(async (req, res) => {
  const data = await messageService.getConversationMessages(req.user, Number(req.params.id));
  sendSuccess(res, data, 'Conversation loaded');
});

const createConversation = asyncHandler(async (req, res) => {
  const id = await messageService.createConversation(req.user, req.body);
  sendSuccess(res, { id }, 'Conversation created successfully', 201);
});

const sendMessage = asyncHandler(async (req, res) => {
  const id = await messageService.sendMessage(req.user, Number(req.params.id), req.body.body);
  sendSuccess(res, { id }, 'Message sent successfully', 201);
});

const markConversationAsRead = asyncHandler(async (req, res) => {
  await messageService.markConversationAsRead(req.user, Number(req.params.id));
  sendSuccess(res, null, 'Conversation marked as read');
});

module.exports = {
  listConversations,
  getConversationMessages,
  createConversation,
  sendMessage,
  markConversationAsRead
};
