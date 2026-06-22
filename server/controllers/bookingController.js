const Booking = require('../models/Booking');
const Event = require('../models/Event');
const OTP = require('../models/OTP');
const { sendBookingEmail, sendOTPEmail } = require('../utils/email');
const { deductSeats, hasEnoughSeats, restoreSeats } = require('../utils/seatInventory');
const { parseSeatQuantity } = require('../utils/validation');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.sendBookingOTP = async (req, res) => {
    let createdOTP = null;
    try {
        const otp = generateOTP();
        await OTP.findOneAndDelete({ email: req.user.email, action: 'event_booking' });
        createdOTP = await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOTPEmail(req.user.email, otp, 'event_booking');
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        if (createdOTP?._id) {
            await OTP.deleteOne({ _id: createdOTP._id });
        }
        res.status(502).json({
            message: 'Could not send OTP email. Please check the email configuration and try again.',
            error: error.message
        });
    }
};

exports.bookEvent = async (req, res) => {
    try {
        const { eventId, otp } = req.body;
        const seatsBooked = parseSeatQuantity(req.body.seatsBooked ?? req.body.numberOfSeats ?? req.body.seats ?? req.body.quantity);

        if (!eventId) return res.status(400).json({ message: 'Event is required' });
        if (!otp) return res.status(400).json({ message: 'OTP is required' });
        if (!seatsBooked) return res.status(400).json({ message: 'Seats must be a positive whole number' });

        // Verify OTP explicitly before proceeding
        const validOTP = await OTP.findOne({ email: req.user.email, otp, action: 'event_booking' });
        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP for booking' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.availableSeats <= 0) return res.status(400).json({ message: 'No seats available' });
        if (!hasEnoughSeats(event.availableSeats, seatsBooked)) {
            return res.status(400).json({ message: `Only ${event.availableSeats} seats are available` });
        }

        const existingBooking = await Booking.findOne({ userId: req.user.id, eventId });
        if (existingBooking && existingBooking.status !== 'cancelled') {
            return res.status(400).json({ message: 'Already booked or pending' });
        }

        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            seatsBooked,
            status: 'pending',
            paymentStatus: 'not_paid',
            amount: Number(event.ticketPrice || 0) * seatsBooked
        });

        await OTP.deleteOne({ _id: validOTP._id }); // cleanup

        res.status(201).json({ message: 'Booking request submitted', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.confirmBooking = async (req, res) => {
    try {
        const { paymentStatus } = req.body; // 'paid' or 'not_paid'
        const booking = await Booking.findById(req.params.id).populate('userId').populate('eventId');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'confirmed') return res.status(400).json({ message: 'Booking is already confirmed' });
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Cannot confirm a cancelled booking' });

        const event = await Event.findById(booking.eventId._id);
        const seatsBooked = booking.seatsBooked || 1;
        const nextAvailableSeats = deductSeats(event.availableSeats, seatsBooked);
        if (nextAvailableSeats === null) {
            return res.status(400).json({ message: `Only ${event.availableSeats} seats are available to confirm this booking` });
        }

        booking.status = 'confirmed';
        if (paymentStatus) {
            booking.paymentStatus = paymentStatus;
        }
        await booking.save();

        event.availableSeats = nextAvailableSeats;
        await event.save();

        // Send email on admin confirmation
        await sendBookingEmail(booking.userId.email, booking.userId.name, booking.eventId.title);

        res.json({ message: 'Booking confirmed successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = req.user.role === 'admin'
            ? await Booking.find().populate('eventId').populate('userId', 'name email').sort({ createdAt: -1 })
            : await Booking.find({ userId: req.user.id }).populate('eventId').sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.markAsPaid = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Only the booking owner can pay
        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot pay for a cancelled booking' });
        }
        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Already marked as paid' });
        }

        booking.paymentStatus = 'paid';
        await booking.save();

        res.json({ message: 'Payment recorded successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

        const wasConfirmed = booking.status === 'confirmed';

        booking.status = 'cancelled';
        await booking.save();

        // Only restore seats if they were actually confirmed and deducted
        if (wasConfirmed) {
            const event = await Event.findById(booking.eventId);
            if (event) {
                event.availableSeats = restoreSeats(event.availableSeats, event.totalSeats, booking.seatsBooked || 1);
                await event.save();
            }
        }

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
