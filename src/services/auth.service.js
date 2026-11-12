const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { parseDuration } = require('../utils/duration');

const BCRYPT_ROUNDS = 12;

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    preferences: user.preferences,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
  };
}

function signToken(user, type) {
  const isAccess = type === 'access';
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      tv: user.tokenVersion || 0,
      type,
    },
    isAccess ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET,
    { expiresIn: isAccess ? env.ACCESS_TOKEN_TTL : env.REFRESH_TOKEN_TTL },
  );
}

function verifyToken(token, type) {
  try {
    const payload = jwt.verify(
      token,
      type === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET,
    );

    if (payload.type !== type) {
      throw new Error('Tipo de token invalido');
    }

    return payload;
  } catch (_error) {
    throw ApiError.unauthorized('Sesion invalida o expirada');
  }
}

function verifyAccessToken(token) {
  return verifyToken(token, 'access');
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: env.refreshCookiePath,
    maxAge: parseDuration(env.REFRESH_TOKEN_TTL),
  };
}

function setRefreshCookie(res, token) {
  res.cookie(env.refreshCookieName, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const options = refreshCookieOptions();
  delete options.maxAge;
  res.clearCookie(env.refreshCookieName, options);
}

function issueSession(res, user) {
  const accessToken = signToken(user, 'access');
  const refreshToken = signToken(user, 'refresh');
  setRefreshCookie(res, refreshToken);

  return { user: serializeUser(user), accessToken };
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.exists({ email: normalizedEmail });

  if (exists) {
    throw ApiError.conflict('Ya existe una cuenta con ese email');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  return user;
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash',
  );

  if (!user) {
    throw ApiError.unauthorized('Credenciales invalidas');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw ApiError.unauthorized('Credenciales invalidas');
  }

  user.lastLoginAt = new Date();
  await user.save();

  user.passwordHash = undefined;
  return user;
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Sesion no encontrada');
  }

  const payload = verifyToken(refreshToken, 'refresh');
  const user = await User.findById(payload.sub);

  if (!user) {
    throw ApiError.unauthorized('La cuenta ya no existe');
  }

  if (Number(payload.tv || 0) !== Number(user.tokenVersion || 0)) {
    throw ApiError.unauthorized('La sesion fue revocada');
  }

  return user;
}

module.exports = {
  clearRefreshCookie,
  issueSession,
  login,
  refreshSession,
  register,
  serializeUser,
  signToken,
  verifyAccessToken,
};
