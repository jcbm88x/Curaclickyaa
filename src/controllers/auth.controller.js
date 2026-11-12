const env = require('../config/env');
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  const session = authService.issueSession(res, user);
  res.status(201).json(session);
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  const session = authService.issueSession(res, user);
  res.json(session);
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.refreshCookieName];
  const user = await authService.refreshSession(token);
  const session = authService.issueSession(res, user);
  res.json(session);
});

const logout = asyncHandler(async (_req, res) => {
  authService.clearRefreshCookie(res);
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json({ user: authService.serializeUser(req.user) });
});

module.exports = { login, logout, me, refresh, register };
