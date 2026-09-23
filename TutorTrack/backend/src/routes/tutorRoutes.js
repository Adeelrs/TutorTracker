const express = require('express');
const tutorsController = require('../controllers/tutorsController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', tutorsController.listTutors);
router.get('/assigned-students', requireRole('tutor'), tutorsController.getAssignedStudents);

module.exports = router;
