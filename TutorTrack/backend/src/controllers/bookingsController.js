const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const bookingService = require('../services/bookingService');

const listBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listBookings(req.user, req.query);
  sendSuccess(res, bookings, 'Bookings loaded');
});

const getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.user, Number(req.params.id));
  sendSuccess(res, booking, 'Booking loaded');
});

const createBooking = asyncHandler(async (req, res) => {
  const id = await bookingService.createBooking(req.user, req.body);
  sendSuccess(res, { id }, 'Booking requested successfully', 201);
});

const updateBooking = asyncHandler(async (req, res) => {
  await bookingService.updateBooking(req.user, Number(req.params.id), req.body);
  sendSuccess(res, null, 'Booking updated');
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  await bookingService.updateBookingStatus(req.user, Number(req.params.id), req.body);
  sendSuccess(res, null, 'Booking status updated');
});

const deleteBooking = asyncHandler(async (req, res) => {
  await bookingService.deleteBooking(req.user, Number(req.params.id));
  sendSuccess(res, null, 'Booking slot cleared');
});

module.exports = {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking
};
