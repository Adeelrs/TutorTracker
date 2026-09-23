const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  sendSuccess(res, result, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.token);
  sendSuccess(res, null, 'Logout successful');
});

const me = asyncHandler(async (req, res) => {
  sendSuccess(res, req.user, 'Current user fetched successfully');
});

module.exports = {
  register,
  login,
  logout,
  me
};

