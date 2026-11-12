const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);

      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'params') {
        req.params = parsed;
      } else {
        req.validatedQuery = parsed;
      }

      req.validated = { ...(req.validated || {}), [source]: parsed };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(ApiError.unprocessable('Datos invalidos', details));
        return;
      }
      next(error);
    }
  };
}

module.exports = validate;
