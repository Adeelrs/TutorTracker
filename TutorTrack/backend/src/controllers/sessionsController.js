const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const sessionService = require('../services/sessionService');

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionService.listSessions(req.user, req.query);
  sendSuccess(res, sessions, 'Sessions loaded successfully');
});

const getSession = asyncHandler(async (req, res) => {
  const session = await sessionService.getSessionById(req.user, Number(req.params.id));
  sendSuccess(res, session, 'Session loaded successfully');
});

const createSession = asyncHandler(async (req, res) => {
  const id = await sessionService.createSession(req.user, req.body);
  sendSuccess(res, { id }, 'Session created successfully', 201);
});

const updateSession = asyncHandler(async (req, res) => {
  await sessionService.updateSession(req.user, Number(req.params.id), req.body);
  sendSuccess(res, null, 'Session updated successfully');
});

const deleteSession = asyncHandler(async (req, res) => {
  await sessionService.deleteSession(req.user, Number(req.params.id));
  sendSuccess(res, null, 'Session deleted successfully');
});

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession
};
