const express = require('express');
const parentsController = require('../controllers/parentsController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', requireRole('manager', 'tutor', 'parent'), parentsController.listParents);

module.exports = router;
