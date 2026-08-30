const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { uploadAvatar, removeAvatar, getOverview, getStats } = require('../controllers/user.controller');

router.use(requireAuth);
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/avatar', removeAvatar);
router.get('/overview', getOverview);
router.get('/stats', getStats);

module.exports = router;
