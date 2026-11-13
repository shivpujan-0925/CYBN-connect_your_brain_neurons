const User = require('../models/User');
const Problem = require('../models/Problem');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const { isDueToday, isOverdue } = require('../utils/spacedRepetition');
const { computeStreaks, computeTopicBreakdown, computeDifficultyBreakdown, computeWeeklyActivity } = require('../utils/stats');

function streamUpload(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'cybn/avatars', public_id: publicId, overwrite: true, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/** Upload / replace the logged-in user's profile picture. */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file was uploaded.');
  if (!isConfigured) {
    throw new ApiError(503, 'Photo upload is not configured yet. Add Cloudinary credentials to backend/.env.');
  }

  const result = await streamUpload(req.file.buffer, `user_${req.user.id}`);

  await User.findByIdAndUpdate(req.user.id, {
    avatar_url: result.secure_url,
    avatar_public_id: result.public_id,
  });

  res.json({ ok: true, avatar_url: result.secure_url });
});

/** Remove the profile picture and fall back to the default anonymous avatar. */
const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (user?.avatar_public_id && isConfigured) {
    await cloudinary.uploader.destroy(user.avatar_public_id).catch(() => {});
  }
  await User.findByIdAndUpdate(req.user.id, { avatar_url: null, avatar_public_id: null });
  res.json({ ok: true });
});

/** Dashboard summary: totals, consistency graph data, due-today / overdue lists. */
const getOverview = asyncHandler(async (req, res) => {
  const problems = await Problem.find({ user_id: req.user.id }).lean();

  const totalSolved = problems.length;
  const totalMastered = problems.filter((p) => p.status === 'mastered').length;

  const dueToday = problems.filter((p) => isDueToday(p) && !isOverdue(p));
  const overdue = problems.filter((p) => isOverdue(p));

  // Consistency graph: full 1-year (52 full weeks = 364 days) of DSA solves & revisions
  const today = new Date();
  const daysToShow = 52 * 7; // 364 days (52 full weeks)
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - (daysToShow - 1));
  since.setUTCHours(0, 0, 0, 0);

  const counts = {};
  for (const p of problems) {
    for (let stage = 0; stage <= 5; stage++) {
      const ts = stage === 0 ? p.day0_completed_at : p[`day${stage}_completed_at`];
      if (!ts) continue;
      const completedAt = new Date(ts);
      if (completedAt >= since) {
        const day = completedAt.toISOString().slice(0, 10);
        counts[day] = (counts[day] || 0) + 1;
      }
    }
  }

  const consistency = [];
  const cursor = new Date(since);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    consistency.push({ date: key, count: counts[key] || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const { currentStreak, longestStreak } = computeStreaks(problems);

  res.json({
    ok: true,
    overview: {
      totalSolved,
      totalMastered,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      consistency,
      currentStreak,
      longestStreak,
    },
  });
});

/** Dedicated stats page: topic/difficulty breakdown, weekly activity. Separate from
 *  the dashboard overview so the (slightly heavier) breakdown work only happens
 *  when the user actually visits the stats page. */
const getStats = asyncHandler(async (req, res) => {
  const problems = await Problem.find({ user_id: req.user.id }).lean();
  const { currentStreak, longestStreak } = computeStreaks(problems);

  res.json({
    ok: true,
    stats: {
      totalSolved: problems.length,
      totalMastered: problems.filter((p) => p.status === 'mastered').length,
      currentStreak,
      longestStreak,
      topicBreakdown: computeTopicBreakdown(problems),
      difficultyBreakdown: computeDifficultyBreakdown(problems),
      weeklyActivity: computeWeeklyActivity(problems),
    },
  });
});

module.exports = { uploadAvatar, removeAvatar, getOverview, getStats };
