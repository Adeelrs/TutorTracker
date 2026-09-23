const express = require('express');
const relationshipsController = require('../controllers/relationshipsController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('manager'));

router.get('/tutor-students', relationshipsController.listTutorStudentLinks);
router.post('/tutor-students', relationshipsController.createTutorStudentLink);
router.delete('/tutor-students/:id', relationshipsController.removeTutorStudentLink);

router.get('/parent-students', relationshipsController.listParentStudentLinks);
router.post('/parent-students', relationshipsController.createParentStudentLink);
router.delete('/parent-students/:id', relationshipsController.removeParentStudentLink);

module.exports = router;

