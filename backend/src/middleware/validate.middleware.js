const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/apiResponse');

/**
 * Runs an array of express-validator chains, then checks for errors.
 * Usage: router.post('/x', validate([body('email').isEmail()]), handler)
 */
function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));

    next(new ApiError(422, 'Validation failed', formatted));
  };
}

module.exports = validate;