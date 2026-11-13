const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  initSchedule,
  completeStage,
  restartSchedule,
  isDueToday,
  isOverdue,
} = require('../src/utils/spacedRepetition');
const {
  computeStreaks,
  computeTopicBreakdown,
  computeDifficultyBreakdown,
  computeWeeklyActivity,
} = require('../src/utils/stats');

describe('Spaced Repetition & Business Logic Tests', () => {
  describe('Schedule Transitions', () => {
    it('initializes schedule at stage 0 with Day 1 scheduled 24 hours later', () => {
      const schedule = initSchedule();
      assert.equal(schedule.current_stage, 0);
      assert.equal(schedule.status, 'active');
      assert.ok(typeof schedule.day0_completed_at === 'string');
      assert.ok(typeof schedule.day1_due_at === 'string');

      const diffMs = new Date(schedule.day1_due_at).getTime() - new Date(schedule.day0_completed_at).getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      assert.equal(diffHours, 24);
    });

    it('advances stages sequentially (Day 1 -> Day 3 -> Day 7 -> Day 14 -> Day 30)', () => {
      let problem = { current_stage: 0, status: 'active' };

      // Complete stage 1
      let updates = completeStage(problem, 1);
      assert.equal(updates.current_stage, 1);
      assert.ok(typeof updates.day2_due_at === 'string');

      // Complete stage 2
      problem = { ...problem, ...updates };
      updates = completeStage(problem, 2);
      assert.equal(updates.current_stage, 2);
      assert.ok(typeof updates.day3_due_at === 'string');

      // Complete stage 3
      problem = { ...problem, ...updates };
      updates = completeStage(problem, 3);
      assert.equal(updates.current_stage, 3);
      assert.ok(typeof updates.day4_due_at === 'string');

      // Complete stage 4
      problem = { ...problem, ...updates };
      updates = completeStage(problem, 4);
      assert.equal(updates.current_stage, 4);
      assert.ok(typeof updates.day5_due_at === 'string');

      // Complete stage 5 -> Mastered!
      problem = { ...problem, ...updates };
      updates = completeStage(problem, 5);
      assert.equal(updates.current_stage, 5);
      assert.equal(updates.status, 'mastered');
    });

    it('rejects invalid or out-of-order stage completion attempts', () => {
      const problem = { current_stage: 1, status: 'active' };
      assert.throws(() => {
        completeStage(problem, 3); // jumping from stage 1 to 3
      });
      assert.throws(() => {
        completeStage(problem, 1); // repeating already completed stage
      });
    });

    it('restarts schedule cleanly from Day 0', () => {
      const problem = {
        current_stage: 3,
        status: 'active',
        restart_count: 1,
        day1_completed_at: new Date().toISOString(),
      };
      const restarted = restartSchedule(problem);
      assert.equal(restarted.current_stage, 0);
      assert.equal(restarted.status, 'active');
      assert.equal(restarted.restart_count, 2);
      assert.ok(typeof restarted.day1_due_at === 'string');
    });
  });

  describe('Due Date & Overdue Detection', () => {
    it('detects problems due today accurately', () => {
      const now = new Date();
      const problemDueToday = {
        status: 'active',
        current_stage: 0,
        day1_due_at: now,
      };
      assert.equal(isDueToday(problemDueToday), true);
      assert.equal(isOverdue(problemDueToday), false);
    });

    it('detects overdue problems correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      const problemOverdue = {
        status: 'active',
        current_stage: 0,
        day1_due_at: yesterday,
      };
      assert.equal(isOverdue(problemOverdue), true);
    });

    it('mastered problems are never due or overdue', () => {
      const past = new Date('2020-01-01');
      const masteredProblem = {
        status: 'mastered',
        current_stage: 5,
        day5_due_at: past,
      };
      assert.equal(isDueToday(masteredProblem), false);
      assert.equal(isOverdue(masteredProblem), false);
    });
  });

  describe('Stats & Analytics Aggregation', () => {
    it('computes correct streak metrics', () => {
      const today = new Date().toISOString().slice(0, 10);
      const problems = [
        {
          day0_completed_at: new Date(today + 'T10:00:00Z'),
        },
      ];
      const { currentStreak, longestStreak } = computeStreaks(problems);
      assert.equal(currentStreak, 1);
      assert.ok(longestStreak >= 1);
    });

    it('computes difficulty breakdown percentages properly', () => {
      const problems = [
        { difficulty: 'Easy' },
        { difficulty: 'Easy' },
        { difficulty: 'Medium' },
        { difficulty: 'Hard' },
      ];
      const breakdown = computeDifficultyBreakdown(problems);
      assert.equal(breakdown.Easy, 2);
      assert.equal(breakdown.Medium, 1);
      assert.equal(breakdown.Hard, 1);
    });

    it('computes topic breakdown with correct ordering', () => {
      const problems = [
        { topic: 'Arrays' },
        { topic: 'Arrays' },
        { topic: 'Dynamic Programming' },
      ];
      const breakdown = computeTopicBreakdown(problems);
      assert.ok(Array.isArray(breakdown));
      assert.equal(breakdown[0].topic, 'Arrays');
      assert.equal(breakdown[0].count, 2);
      assert.equal(breakdown[1].topic, 'Dynamic Programming');
      assert.equal(breakdown[1].count, 1);
    });

    it('computes 8-week weekly activity with non-negative counts', () => {
      const problems = [];
      const weekly = computeWeeklyActivity(problems);
      assert.equal(weekly.length, 8);
      for (const week of weekly) {
        assert.ok(typeof week.label === 'string');
        assert.ok(typeof week.weekRange === 'string');
        assert.equal(week.count, 0);
      }
    });
  });
});
