const rateLimit = require('express-rate-limit');

/** Applies to /signup and /login specifically — these are the routes someone
 *  could brute-force (guessing passwords, mass-creating accounts). 10 attempts
 *  per 15 minutes per IP is generous for a real user, tight for an automated attack. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

module.exports = { authLimiter };
