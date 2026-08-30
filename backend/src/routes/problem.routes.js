const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const {
  createProblem,
  listProblems,
  getProblem,
  updateProblem,
  deleteProblem,
  completeProblemStage,
  restartProblem,
  importFromLeetCode,
} = require('../controllers/problem.controller');

router.use(requireAuth);
router.post('/import-leetcode', importFromLeetCode);
router.post('/', createProblem);
router.get('/', listProblems);
router.get('/:id', getProblem);
router.patch('/:id', updateProblem);
router.delete('/:id', deleteProblem);
router.post('/:id/complete-stage', completeProblemStage);
router.post('/:id/restart', restartProblem);

module.exports = router;
