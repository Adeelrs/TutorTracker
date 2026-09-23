const express = require('express');
const managerController = require('../controllers/managerController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('manager'));
router.get('/tutor-approvals', managerController.listTutorApprovals);
router.put('/tutors/:id/approval', managerController.updateTutorApproval);

module.exports = router;
