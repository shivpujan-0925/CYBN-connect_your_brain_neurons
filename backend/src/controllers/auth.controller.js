const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// function cookieOptions() {
//   return {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'lax',
//     maxAge: COOKIE_MAX_AGE_MS,
//   };
// }

function cookieOptions() { const isProd = process.env.NODE_ENV === 'production';
   return { httpOnly: true,
            secure: isProd, 
            sameSite: isProd ? 'none' : 'lax', maxAge: COOKIE_MAX_AGE_MS,
           }; 
          }

const signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new ApiError(400, 'Username, email, and password are all required.');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters.');
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new ApiError(400, 'Username must be 3-20 characters: letters, numbers, underscore only.');
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
  if (existing) {
    throw new ApiError(409, 'An account with that email or username already exists.');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password_hash });

  const token = signToken({ sub: user._id });
  res.cookie(process.env.COOKIE_NAME || 'cybn_token', token, cookieOptions());
  res.status(201).json({ ok: true, user: user.toJSON(), token });
});

const login = asyncHandler(async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    throw new ApiError(400, 'Email/username and password are required.');
  }

  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Incorrect email/username or password.');
  }

  const token = signToken({ sub: user._id });
  res.cookie(process.env.COOKIE_NAME || 'cybn_token', token, cookieOptions());
  res.json({ ok: true, user: user.toJSON(), token });
});

// const logout = asyncHandler(async (req, res) => {
//   res.clearCookie(process.env.COOKIE_NAME || 'cybn_token');
//   res.json({ ok: true });
// });

const logout = asyncHandler(async (req, res) => { const { maxAge, ...clearOptions } = cookieOptions(); res.clearCookie(process.env.COOKIE_NAME || 'cybn_token', clearOptions); res.json({ ok: true }); });

const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = { signup, login, logout, me };
