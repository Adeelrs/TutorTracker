const express = require('express');
const studentsController = require('../controllers/studentsController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', studentsController.listStudents);
router.get('/dashboard', studentsController.getStudentDashboard);

module.exports = router;

