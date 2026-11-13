/**
 * Turns raw problem rows into the numbers shown on the dashboard and stats page.
 * "Activity" for streak purposes means: any Day 0-5 completion timestamp — i.e.
 * logging a new problem OR completing a scheduled revision both count as showing up.
 */

/** Normalizes a Date object OR an ISO string into a 'YYYY-MM-DD' key. */
function toDateKey(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

function activityDaySet(problems) {
  const days = new Set();
  for (const p of problems) {
    for (let stage = 0; stage <= 5; stage++) {
      const ts = stage === 0 ? p.day0_completed_at : p[`day${stage}_completed_at`];
      const key = toDateKey(ts);
      if (key) days.add(key);
    }
  }
  return days;
}

/** Current streak (consecutive days up to today or yesterday) and longest streak ever. */
function computeStreaks(problems, referenceDate = new Date()) {
  const days = activityDaySet(problems);
  if (days.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const sorted = [...days].sort();

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    run = diffDays === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const todayKey = referenceDate.toISOString().slice(0, 10);
  const yesterday = new Date(referenceDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let currentStreak = 0;
  if (days.has(todayKey) || days.has(yesterdayKey)) {
    const cursor = new Date(days.has(todayKey) ? todayKey : yesterdayKey);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  return { currentStreak, longestStreak };
}

/** Top topics by problem count, for the "where am I actually practicing" view. */
function computeTopicBreakdown(problems, limit = 8) {
  const counts = {};
  for (const p of problems) {
    const topic = (p.topic || '').trim() || 'Uncategorized';
    counts[topic] = (counts[topic] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function computeDifficultyBreakdown(problems) {
  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  for (const p of problems) {
    const d = p.difficulty || 'Medium';
    if (counts[d] !== undefined) counts[d]++;
  }
  return counts;
}

/** Problems solved or revised per week, last 8 rolling 7-day windows ending today. */
function computeWeeklyActivity(problems, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setUTCHours(23, 59, 59, 999);

  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd = new Date(end);
    weekEnd.setUTCDate(weekEnd.getUTCDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    weekStart.setUTCHours(0, 0, 0, 0);
    weeks.push({ start: weekStart, end: weekEnd, count: 0 });
  }

  for (const p of problems) {
    for (let stage = 0; stage <= 5; stage++) {
      const ts = stage === 0 ? p.day0_completed_at : p[`day${stage}_completed_at`];
      if (!ts) continue;
      const d = ts instanceof Date ? ts : new Date(ts);
      const week = weeks.find((w) => d >= w.start && d <= w.end);
      if (week) week.count++;
    }
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return weeks.map((w) => ({
    label: `${w.start.getUTCMonth() + 1}/${w.start.getUTCDate()}`,
    weekRange: `${monthNames[w.start.getUTCMonth()]} ${w.start.getUTCDate()} – ${monthNames[w.end.getUTCMonth()]} ${w.end.getUTCDate()}`,
    count: w.count,
  }));
}

module.exports = { computeStreaks, computeTopicBreakdown, computeDifficultyBreakdown, computeWeeklyActivity };
