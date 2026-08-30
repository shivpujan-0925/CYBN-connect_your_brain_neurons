const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const cookieName = process.env.COOKIE_NAME || 'cybn_token';
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.[cookieName] || bearer;

  if (!token) {
    return next(new ApiError(401, 'Please log in to continue.'));
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).lean();
    if (!user) return next(new ApiError(401, 'Session is no longer valid. Please log in again.'));
    req.user = { id: user._id, username: user.username, email: user.email, avatar_url: user.avatar_url };
    next();
  } catch (err) {
    next(new ApiError(401, 'Session expired. Please log in again.'));
  }
}

module.exports = { requireAuth };
