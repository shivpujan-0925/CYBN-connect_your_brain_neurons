const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendEmail } = require('../utils/mailer');

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** The raw token goes in the email link; only its hash is stored in the DB,
 *  so a database leak alone can't be used to reset anyone's password. */
function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

const signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new ApiError(400, 'Username, email, and password are all required.');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters.');
  }
  if (password.length > 128) {
    throw new ApiError(400, 'Password cannot exceed 128 characters.');
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new ApiError(400, 'Username must be 3-20 characters: letters, numbers, underscore only.');
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ $or: [{ email: cleanEmail }, { username }] }).lean();
  if (existing) {
    throw new ApiError(409, 'An account with that email or username already exists.');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email: cleanEmail, password_hash });

  const token = signToken({ sub: user._id });
  res.cookie(process.env.COOKIE_NAME || 'cybn_token', token, cookieOptions());
  res.status(201).json({ ok: true, user: user.toJSON(), token });
});

const login = asyncHandler(async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password || typeof emailOrUsername !== 'string' || typeof password !== 'string') {
    throw new ApiError(400, 'Email/username and password are required.');
  }

  const cleanQuery = emailOrUsername.trim();
  const user = await User.findOne({
    $or: [{ email: cleanQuery.toLowerCase() }, { username: cleanQuery }],
  });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Incorrect email/username or password.');
  }

  const token = signToken({ sub: user._id });
  res.cookie(process.env.COOKIE_NAME || 'cybn_token', token, cookieOptions());
  res.json({ ok: true, user: user.toJSON(), token });
});

const logout = asyncHandler(async (req, res) => {
  const { maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie(process.env.COOKIE_NAME || 'cybn_token', clearOptions);
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: req.user });
});

/** POST /api/auth/forgot-password — always responds the same way whether or
 *  not the email exists, so this endpoint can't be used to check which emails
 *  have accounts. */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') throw new ApiError(400, 'Email is required.');

  const genericResponse = {
    ok: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  const cleanEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    return res.json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.reset_password_token = hashResetToken(rawToken);
  user.reset_password_expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  const resetUrl = `${process.env.FRONTEND_RESET_URL || 'http://localhost:3000/reset-password.html'}?token=${rawToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your CYBN password',
      html: `
        <p>Someone (hopefully you) requested a password reset for your CYBN account.</p>
        <p><a href="${resetUrl}">Click here to set a new password</a> — this link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    });
  } catch (err) {
    console.error('[forgotPassword] Failed to send reset email:', err.message);
  }

  res.json(genericResponse);
});

/** POST /api/auth/reset-password — body: { token, password } */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
    throw new ApiError(400, 'Reset token and new password are required.');
  }
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.');
  if (password.length > 128) throw new ApiError(400, 'Password cannot exceed 128 characters.');

  const user = await User.findOne({
    reset_password_token: hashResetToken(token),
    reset_password_expires: { $gt: new Date() },
  }).select('+reset_password_token +reset_password_expires');

  if (!user) {
    throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }

  user.password_hash = await bcrypt.hash(password, 10);
  user.reset_password_token = null;
  user.reset_password_expires = null;
  await user.save();

  res.json({ ok: true, message: 'Password updated — you can log in with your new password now.' });
});

module.exports = { signup, login, logout, me, forgotPassword, resetPassword };