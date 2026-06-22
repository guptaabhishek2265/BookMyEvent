const test = require('node:test');
const assert = require('node:assert/strict');
const {
    parseSeatQuantity,
    validateEventPayload,
    validateLogin,
    validateRegistration
} = require('../utils/validation');
const { deductSeats, hasEnoughSeats, restoreSeats } = require('../utils/seatInventory');

test('parseSeatQuantity accepts positive whole numbers', () => {
    assert.equal(parseSeatQuantity(1), 1);
    assert.equal(parseSeatQuantity('3'), 3);
});

test('parseSeatQuantity rejects invalid quantities', () => {
    assert.equal(parseSeatQuantity(0), null);
    assert.equal(parseSeatQuantity('2.5'), null);
    assert.equal(parseSeatQuantity('abc'), null);
});

test('validateEventPayload requires valid event inventory', () => {
    const validEvent = {
        title: 'Tech Summit',
        description: 'A practical conference.',
        date: '2026-07-10',
        location: 'Delhi',
        category: 'Technology',
        totalSeats: 50,
        ticketPrice: 499
    };

    assert.equal(validateEventPayload(validEvent), null);
    assert.equal(validateEventPayload({ ...validEvent, totalSeats: 0 }), 'Total seats must be a positive whole number');
    assert.equal(validateEventPayload({ ...validEvent, ticketPrice: -1 }), 'Ticket price cannot be negative');
});

test('auth validation returns useful errors', () => {
    assert.equal(validateRegistration({ name: '', email: 'bad', password: '123' }), 'Name is required');
    assert.equal(validateRegistration({ name: 'Ada', email: 'ada@example.com', password: 'secret1' }), null);
    assert.equal(validateLogin({ email: 'ada@example.com', password: '' }), 'Password is required');
});

test('seat inventory helpers handle multi-seat booking math', () => {
    assert.equal(hasEnoughSeats(5, 3), true);
    assert.equal(hasEnoughSeats(2, 3), false);
    assert.equal(deductSeats(5, 3), 2);
    assert.equal(deductSeats(2, 3), null);
    assert.equal(restoreSeats(8, 10, 3), 10);
    assert.equal(restoreSeats(4, 10, 3), 7);
});
