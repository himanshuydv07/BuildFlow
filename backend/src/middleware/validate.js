const ApiError = require('../utils/ApiError');

/**
 * validate({ body, params, query }) — each value is a zod schema.
 * On success, replaces req.body/params/query with the *parsed* (and
 * therefore type-coerced/defaulted) values.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      if (err.errors) {
        const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        return next(ApiError.badRequest('Validation failed', errors));
      }
      next(err);
    }
  };
}

module.exports = validate;
