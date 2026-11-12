const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const skip = () => env.isTest;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: 'Demasiados intentos de autenticacion. Espera unos minutos.' },
});

module.exports = { apiLimiter, authLimiter };
