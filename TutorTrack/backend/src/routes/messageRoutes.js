const express = require('express');
const messagesController = require('../controllers/messagesController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/conversations', messagesController.listConversations);
router.get('/conversations/:id', messagesController.getConversationMessages);
router.post('/conversations', messagesController.createConversation);
router.post('/conversations/:id/messages', messagesController.sendMessage);
router.post('/conversations/:id/read', messagesController.markConversationAsRead);

module.exports = router;

