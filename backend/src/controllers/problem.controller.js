const Problem = require('../models/Problem');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { initSchedule, completeStage, restartSchedule, isDueToday, isOverdue } = require('../utils/spacedRepetition');

function decorate(problem) {
  return {
    ...problem,
    is_due_today: isDueToday(problem),
    is_overdue: isOverdue(problem),
  };
}

/** Converts a lean Mongoose doc (which has `_id`) into the API shape the frontend
 *  expects (`id`), matching the original SQLite-backed response shape exactly. */
function toApiProblem(doc) {
  const { _id, __v, ...rest } = doc;
  return decorate({ ...rest, id: _id });
}

async function getOwnedProblem(userId, problemId) {
  const problem = await Problem.findById(problemId).lean();
  if (!problem) throw new ApiError(404, 'Problem not found.');
  if (problem.user_id !== userId) throw new ApiError(403, 'You do not have access to this problem.');
  return problem;
}

/** Pulls the "titleSlug" out of any LeetCode problem URL shape, e.g.
 *  https://leetcode.com/problems/two-sum/  or  .../two-sum/description/  -> "two-sum" */
function extractLeetCodeSlug(url) {
  const match = String(url).match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

/** POST /api/problems/import-leetcode — fetch a problem's real name/difficulty/topics
 *  by URL, so the Add Problem form can be pre-filled instead of typed by hand.
 *  Uses LeetCode's own public GraphQL endpoint (the same one leetcode.com's frontend
 *  calls) — unofficial and undocumented, so this can break if LeetCode changes it. */
const importFromLeetCode = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const slug = extractLeetCodeSlug(url || '');
  if (!slug) throw new ApiError(400, 'That doesn\'t look like a LeetCode problem URL.');

  let response;
  try {
    response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            difficulty
            topicTags { name }
          }
        }`,
        variables: { titleSlug: slug },
      }),
    });
  } catch (err) {
    throw new ApiError(502, 'Could not reach LeetCode right now — fill the form in manually instead.');
  }

  if (!response.ok) {
    throw new ApiError(502, 'LeetCode did not return a valid response — fill the form in manually instead.');
  }

  const data = await response.json().catch(() => null);
  const question = data?.data?.question;
  if (!question) {
    throw new ApiError(404, 'No LeetCode problem found at that URL.');
  }

  res.json({
    ok: true,
    imported: {
      name: question.title,
      difficulty: question.difficulty,
      topic: (question.topicTags || []).map((t) => t.name).join(', '),
      link: `https://leetcode.com/problems/${slug}/`,
    },
  });
});

/** POST /api/problems — user adds a newly solved problem (Day 0). */
const createProblem = asyncHandler(async (req, res) => {
  const { name, topic, pattern, time_complexity, space_complexity, difficulty, notes, link } = req.body;
  if (!name || !name.trim()) throw new ApiError(400, 'Problem name is required.');

  const schedule = initSchedule();

  const problem = await Problem.create({
    user_id: req.user.id,
    name: name.trim(),
    topic: topic || null,
    pattern: pattern || null,
    time_complexity: time_complexity || null,
    space_complexity: space_complexity || null,
    difficulty: difficulty || 'Medium',
    notes: notes || null,
    link: link || null,
    current_stage: schedule.current_stage,
    status: schedule.status,
    day0_completed_at: schedule.day0_completed_at,
    day1_due_at: schedule.day1_due_at,
  });

  res.status(201).json({ ok: true, problem: toApiProblem(problem.toObject()) });
});

/** GET /api/problems — full list (optionally filtered), for "Total Problem revision list". */
const listProblems = asyncHandler(async (req, res) => {
  const { filter } = req.query; // 'due' | 'overdue' | 'mastered' | 'active' | undefined (all)
  let problems = (await Problem.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean()).map(toApiProblem);

  if (filter === 'due') problems = problems.filter((p) => p.is_due_today && !p.is_overdue);
  if (filter === 'overdue') problems = problems.filter((p) => p.is_overdue);
  if (filter === 'mastered') problems = problems.filter((p) => p.status === 'mastered');
  if (filter === 'active') problems = problems.filter((p) => p.status === 'active');

  res.json({ ok: true, problems });
});

/** GET /api/problems/:id — full detail page. */
const getProblem = asyncHandler(async (req, res) => {
  const problem = await getOwnedProblem(req.user.id, req.params.id);
  res.json({ ok: true, problem: toApiProblem(problem) });
});

/** PATCH /api/problems/:id — edit problem details (not the schedule). */
const updateProblem = asyncHandler(async (req, res) => {
  await getOwnedProblem(req.user.id, req.params.id); // ownership check
  const fields = ['name', 'topic', 'pattern', 'time_complexity', 'space_complexity', 'difficulty', 'notes', 'link'];
  const updates = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (Object.keys(updates).length === 0) throw new ApiError(400, 'No editable fields were provided.');

  const updated = await Problem.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
  res.json({ ok: true, problem: toApiProblem(updated) });
});

/** DELETE /api/problems/:id */
const deleteProblem = asyncHandler(async (req, res) => {
  await getOwnedProblem(req.user.id, req.params.id); // ownership check
  await Problem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/** POST /api/problems/:id/complete-stage — tick Day N as done, schedules Day N+1 (or masters it). */
const completeProblemStage = asyncHandler(async (req, res) => {
  const problem = await getOwnedProblem(req.user.id, req.params.id);
  const { stage } = req.body;
  const stageNum = Number(stage);
  if (![1, 2, 3, 4, 5].includes(stageNum)) throw new ApiError(400, 'stage must be an integer from 1 to 5.');

  let updates;
  try {
    updates = completeStage(problem, stageNum);
  } catch (err) {
    throw new ApiError(400, err.message);
  }
  delete updates.updated_at; // Mongoose's timestamps option manages this automatically

  const updated = await Problem.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  res.json({ ok: true, problem: toApiProblem(updated) });
});

/** POST /api/problems/:id/restart — user wants to revise again from Day 0. */
const restartProblem = asyncHandler(async (req, res) => {
  const problem = await getOwnedProblem(req.user.id, req.params.id);
  const updates = restartSchedule(problem);

  const updated = await Problem.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  res.json({ ok: true, problem: toApiProblem(updated) });
});

module.exports = {
  createProblem,
  listProblems,
  getProblem,
  updateProblem,
  deleteProblem,
  completeProblemStage,
  restartProblem,
  importFromLeetCode,
};
