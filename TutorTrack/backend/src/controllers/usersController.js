const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const userService = require('../services/userService');

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfileBundle(req.user.id);
  sendSuccess(res, user, 'User profile loaded');
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.updateOwnProfile(req.user, req.body);
  sendSuccess(res, user, 'Profile updated successfully');
});

const updateManagerUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUserAsManager(Number(req.params.id), req.body);
  sendSuccess(res, user, 'User updated successfully');
});

const deleteManagerUser = asyncHandler(async (req, res) => {
  await userService.deleteUserAsManager(req.user, Number(req.params.id));
  sendSuccess(res, null, 'User deleted successfully');
});

const listAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.query);
  sendSuccess(res, users, 'Users loaded successfully');
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  sendSuccess(res, null, 'Password updated successfully');
});

const createChildAccount = asyncHandler(async (req, res) => {
  const result = await userService.createChildAccount(req.user, req.body);
  sendSuccess(res, result, 'Child account created successfully', 201);
});

const createStudentAsManager = asyncHandler(async (req, res) => {
  const result = await userService.createStudentAsManager(req.user, req.body);
  sendSuccess(res, result, 'Student account created successfully', 201);
});

const listMessageDirectory = asyncHandler(async (req, res) => {
  const contacts = await userService.listMessageDirectory(req.user);
  sendSuccess(res, contacts, 'Message directory loaded successfully');
});

const getManagerUserDetail = asyncHandler(async (req, res) => {
  const detail = await userService.getUserDetailForManager(Number(req.params.id));
  sendSuccess(res, detail, 'User detail loaded successfully');
});

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  updateManagerUser,
  deleteManagerUser,
  listAllUsers,
  changePassword,
  createChildAccount,
  createStudentAsManager,
  listMessageDirectory,
  getManagerUserDetail
};
