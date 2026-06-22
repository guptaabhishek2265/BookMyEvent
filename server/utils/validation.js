const isBlank = (value) => typeof value !== 'string' || value.trim().length === 0;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const parsePositiveInteger = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const validateRegistration = ({ name, email, password } = {}) => {
    if (isBlank(name)) return 'Name is required';
    if (isBlank(email)) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address';
    if (typeof password !== 'string' || password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    return null;
};

const validateLogin = ({ email, password } = {}) => {
    if (isBlank(email)) return 'Email is required';
    if (isBlank(password)) return 'Password is required';
    return null;
};

const validateEventPayload = ({ title, description, date, location, category, totalSeats, ticketPrice } = {}) => {
    if (isBlank(title)) return 'Event title is required';
    if (isBlank(description)) return 'Event description is required';
    if (!date || Number.isNaN(new Date(date).getTime())) return 'Valid event date is required';
    if (isBlank(location)) return 'Event venue is required';
    if (isBlank(category)) return 'Event category is required';

    const seatCount = Number(totalSeats);
    if (!isPositiveInteger(seatCount)) return 'Total seats must be a positive whole number';

    const price = Number(ticketPrice ?? 0);
    if (Number.isNaN(price) || price < 0) return 'Ticket price cannot be negative';

    return null;
};

const parseSeatQuantity = (value) => parsePositiveInteger(value ?? 1);

module.exports = {
    parseSeatQuantity,
    validateEventPayload,
    validateLogin,
    validateRegistration
};
