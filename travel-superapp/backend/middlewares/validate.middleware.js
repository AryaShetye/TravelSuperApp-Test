/**
 * Request Validation Middleware
 * Uses express-validator to validate and sanitize inputs
 */

const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains.
 * Returns 400 with all validation errors if any exist.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }

  next();
}

module.exports = { validate };
