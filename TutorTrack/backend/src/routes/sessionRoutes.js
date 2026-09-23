const express = require('express');
const sessionsController = require('../controllers/sessionsController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', sessionsController.listSessions);
router.get('/:id', sessionsController.getSession);
router.post('/', requireRole('tutor', 'manager'), sessionsController.createSession);
router.put('/:id', requireRole('tutor', 'manager'), sessionsController.updateSession);
router.delete('/:id', requireRole('tutor', 'manager'), sessionsController.deleteSession);

module.exports = router;

