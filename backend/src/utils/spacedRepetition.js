/**
 * CYBN spaced-repetition schedule
 *
 * Day 0 - problem solved for the first time, added to CYBN
 * Day 1 - revise 1 day after Day 0
 * Day 2 - revise 3 days after Day 1
 * Day 3 - revise 7 days after Day 2
 * Day 4 - revise 15 days after Day 3
 * Day 5 - final confirmation -> problem is marked "mastered"
 *
 * Each stage only becomes "due" once the previous stage's due date has been reached
 * (it can also be completed early). Completing a stage schedules the next one relative
 * to the moment it was actually completed, not the original due date, so drift doesn't
 * compound.
 */

const INTERVALS = {
  // stage N : days to wait AFTER stage N-1 is completed
  1: 1,
  2: 3,
  3: 7,
  4: 15,
  5: 0, // day 5 is a manual mastery confirmation, no fixed wait
};

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** Build the initial row values for a freshly created (or restarted) problem. */
function initSchedule(now = new Date().toISOString()) {
  return {
    current_stage: 0,
    status: 'active',
    day0_completed_at: now,
    day1_due_at: addDays(now, INTERVALS[1]),
    day1_completed_at: null,
    day2_due_at: null,
    day2_completed_at: null,
    day3_due_at: null,
    day3_completed_at: null,
    day4_due_at: null,
    day4_completed_at: null,
    day5_due_at: null,
    day5_completed_at: null,
  };
}

/**
 * Given the current row and the stage number being marked complete (1-5),
 * return the field updates to apply.
 */
function completeStage(problem, stage) {
  if (stage !== problem.current_stage + 1) {
    throw new Error(`Cannot complete day ${stage} — problem is currently on day ${problem.current_stage}.`);
  }
  const now = new Date().toISOString();
  const updates = {
    current_stage: stage,
    updated_at: now,
    [`day${stage}_completed_at`]: now,
  };

  if (stage < 5) {
    const nextStage = stage + 1;
    updates[`day${nextStage}_due_at`] = addDays(now, INTERVALS[nextStage]);
  } else {
    updates.status = 'mastered';
  }

  return updates;
}

/** Reset a problem back to day 0, e.g. because the user wants to revise it again. */
function restartSchedule(problem) {
  const now = new Date().toISOString();
  return {
    ...initSchedule(now),
    restart_count: (problem.restart_count || 0) + 1,
  };
}

/** True if the problem's next stage is due today or earlier (and not yet mastered). */
function isDueToday(problem, referenceDate = new Date()) {
  if (problem.status === 'mastered') return false;
  const nextStage = problem.current_stage + 1;
  const dueAt = problem[`day${nextStage}_due_at`];
  if (!dueAt) return false;
  const endOfToday = new Date(referenceDate);
  endOfToday.setUTCHours(23, 59, 59, 999);
  return new Date(dueAt).getTime() <= endOfToday.getTime();
}

/** True if a due date is in the past relative to today, i.e. the user skipped it. */
function isOverdue(problem, referenceDate = new Date()) {
  if (problem.status === 'mastered') return false;
  const nextStage = problem.current_stage + 1;
  const dueAt = problem[`day${nextStage}_due_at`];
  if (!dueAt) return false;
  const startOfToday = new Date(referenceDate);
  startOfToday.setUTCHours(0, 0, 0, 0);
  return new Date(dueAt).getTime() < startOfToday.getTime();
}

module.exports = { initSchedule, completeStage, restartSchedule, isDueToday, isOverdue, INTERVALS };
