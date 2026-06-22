const express = require('express');
const router = express.Router();
const { bookEvent, confirmBooking, getMyBookings, cancelBooking, sendBookingOTP, markAsPaid } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

router.post('/send-otp', protect, sendBookingOTP);
router.post('/', protect, bookEvent);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.put('/:id/pay', protect, markAsPaid);
router.get('/my', protect, getMyBookings);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
