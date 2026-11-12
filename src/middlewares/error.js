const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details = null;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError' && error.errors) {
    statusCode = 422;
    message = 'Datos invalidos';
    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = `Identificador invalido para ${error.path}`;
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || {})[0] || 'campo';
    message = `Ya existe un registro con ese ${field}`;
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON invalido en la solicitud';
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Sesion invalida o expirada';
  }

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  res.status(statusCode).json({
    error: message,
    details: details || undefined,
    ...(env.isProduction ? {} : { stack: error.stack }),
  });
}

module.exports = { notFound, errorHandler };
