const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return success(res, 200, 'Login successful', result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  return success(res, 200, 'Token refreshed', result);
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.user.id, refreshToken);
  return success(res, 200, 'Logged out successfully');
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id, req.user.role);
  return success(res, 200, 'Current user fetched', user);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  return success(res, 200, 'Password changed successfully');
});

module.exports = { login, refresh, logout, me, changePassword };