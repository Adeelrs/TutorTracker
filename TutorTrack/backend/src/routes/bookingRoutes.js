const express = require('express');
const bookingsController = require('../controllers/bookingsController');
const { requireAuth } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', bookingsController.listBookings);
router.get('/:id', bookingsController.getBooking);
router.post('/', bookingsController.createBooking);
router.put('/:id/status', requireRole('tutor', 'manager'), bookingsController.updateBookingStatus);
router.put('/:id', requireRole('tutor', 'manager'), bookingsController.updateBooking);
router.delete('/:id', requireRole('tutor', 'manager'), bookingsController.deleteBooking);

module.exports = router;
