const express = require('express');
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/me', usersController.getCurrentUser);
router.put('/me', usersController.updateCurrentUser);
router.put('/me/password', usersController.changePassword);
router.post('/me/children', requireRole('parent'), usersController.createChildAccount);
router.get('/message-directory', requireRole('student', 'parent'), usersController.listMessageDirectory);
router.get('/', requireRole('manager'), usersController.listAllUsers);
router.post('/students', requireRole('manager'), usersController.createStudentAsManager);
router.put('/:id', requireRole('manager'), usersController.updateManagerUser);
router.delete('/:id', requireRole('manager'), usersController.deleteManagerUser);
router.get('/:id/detail', requireRole('manager'), usersController.getManagerUserDetail);

module.exports = router;
