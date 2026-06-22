const Event = require('../models/Event');
const { validateEventPayload } = require('../utils/validation');

exports.getEvents = async (req, res) => {
    try {
        const filters = {};
        if (req.query.category) filters.category = req.query.category;
        if (req.query.search) filters.title = { $regex: req.query.search, $options: 'i' };

        const events = await Event.find(filters).populate('createdBy', 'name email');
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location, category, totalSeats, ticketPrice, image } = req.body;
        const validationError = validateEventPayload({ title, description, date, location, category, totalSeats, ticketPrice });
        if (validationError) return res.status(400).json({ message: validationError });

        const event = await Event.create({
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice: ticketPrice || 0,
            image: image || '',
            createdBy: req.user.id
        });
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const existingEvent = await Event.findById(req.params.id);
        if (!existingEvent) return res.status(404).json({ message: 'Event not found' });

        const nextEvent = { ...existingEvent.toObject(), ...req.body };
        const validationError = validateEventPayload(nextEvent);
        if (validationError) return res.status(400).json({ message: validationError });

        if (req.body.totalSeats !== undefined) {
            const nextTotalSeats = Number(req.body.totalSeats);
            const bookedSeats = Number(existingEvent.totalSeats) - Number(existingEvent.availableSeats);
            if (nextTotalSeats < bookedSeats) {
                return res.status(400).json({ message: `Total seats cannot be less than ${bookedSeats} already booked seats` });
            }
            req.body.availableSeats = nextTotalSeats - bookedSeats;
        }

        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
