const hasEnoughSeats = (availableSeats, seatsBooked) => Number(availableSeats) >= Number(seatsBooked);

const deductSeats = (availableSeats, seatsBooked) => {
    if (!hasEnoughSeats(availableSeats, seatsBooked)) return null;
    return Number(availableSeats) - Number(seatsBooked);
};

const restoreSeats = (availableSeats, totalSeats, seatsBooked) => (
    Math.min(Number(totalSeats), Number(availableSeats) + Number(seatsBooked))
);

module.exports = {
    deductSeats,
    hasEnoughSeats,
    restoreSeats
};
