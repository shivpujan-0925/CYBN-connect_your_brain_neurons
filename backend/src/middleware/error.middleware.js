const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let { statusCode, message, details } = err instanceof ApiError
    ? err
    : { statusCode: 500, message: 'Something went wrong on our end.', details: null };

  // MongoDB duplicate key violation (unique username/email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `That ${field} is already taken.`;
  }

  // Mongoose schema validation failure
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)[0]?.message || 'Invalid data submitted.';
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode || 500).json({
    ok: false,
    message: message || 'Something went wrong on our end.',
    details: details || undefined,
  });
}

module.exports = { notFound, errorHandler };
