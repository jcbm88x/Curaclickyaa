const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/auth.service');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

async function loadUserFromToken(token) {
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select(
    'name email role tokenVersion preferences createdAt lastLoginAt',
  );

  if (!user) {
    throw ApiError.unauthorized('La cuenta ya no existe');
  }

  if (Number(payload.tv || 0) !== Number(user.tokenVersion || 0)) {
    throw ApiError.unauthorized('La sesion fue revocada');
  }

  return user;
}

async function authenticate(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) throw ApiError.unauthorized('Token de acceso requerido');

    req.user = await loadUserFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      req.user = null;
      next();
      return;
    }

    req.user = await loadUserFromToken(token);
    next();
  } catch (_error) {
    req.user = null;
    next();
  }
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }

    if (roles.length && !roles.includes(req.user.role)) {
      next(ApiError.forbidden('No tienes permisos para esta accion'));
      return;
    }

    next();
  };
}

module.exports = { authenticate, optionalAuth, authorize };
