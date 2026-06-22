import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaChair,
    FaCheckCircle,
    FaClock,
    FaInfoCircle,
    FaLock,
    FaMapMarkerAlt,
    FaReceipt,
    FaShieldAlt,
    FaTicketAlt
} from 'react-icons/fa';

const tabs = ['Overview', 'Venue', 'Booking'];

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
});

const formatPrice = (price) => (Number(price) === 0 ? 'Free' : `Rs. ${Number(price).toLocaleString()}`);

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [activeTab, setActiveTab] = useState('Overview');
    const [toast, setToast] = useState(null);
    const [seatsBooked, setSeatsBooked] = useState(1);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await api.get(`/events/${id}`);
                setEvent(data);
            } catch (err) {
                setError('This event brief could not be loaded.');
                setToast({
                    type: 'error',
                    title: 'Event unavailable',
                    message: 'Please return to Discover and try another listing.'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (!toast) return undefined;
        const timeoutId = setTimeout(() => setToast(null), 3600);
        return () => clearTimeout(timeoutId);
    }, [toast]);

    useEffect(() => {
        if (!event) return;
        setSeatsBooked((current) => Math.max(1, Math.min(Number(current) || 1, Math.max(1, event.availableSeats))));
    }, [event]);

    const handleBooking = async () => {
        if (!user) {
            setToast({
                type: 'info',
                title: 'Sign in required',
                message: 'Log in to request access to this event.'
            });
            navigate('/login');
            return;
        }

        const selectedSeats = Number(seatsBooked);
        if (!Number.isInteger(selectedSeats) || selectedSeats < 1) {
            setToast({
                type: 'error',
                title: 'Invalid seats',
                message: 'Select at least one seat.'
            });
            return;
        }
        if (selectedSeats > event.availableSeats) {
            setToast({
                type: 'error',
                title: 'Not enough seats',
                message: `Only ${event.availableSeats} seats are available.`
            });
            return;
        }

        setBookingLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (!showOTP) {
                await api.post('/bookings/send-otp');
                setShowOTP(true);
                setActiveTab('Booking');
                setSuccessMsg('A secure OTP has been sent to your email.');
                setToast({
                    type: 'success',
                    title: 'OTP sent',
                    message: 'Check your inbox and enter the code to submit your request.'
                });
            } else {
                const { data } = await api.post('/bookings', { eventId: event._id, otp, seatsBooked: selectedSeats });
                setShowOTP(false);
                setOtp('');

                // For paid events → go to payment page; for free → show success inline
                if (Number(event.ticketPrice) > 0) {
                    navigate(`/payment/${data.booking._id}`);
                } else {
                    setSuccessMsg(`Booking request submitted for ${selectedSeats} seat${selectedSeats === 1 ? '' : 's'}. Awaiting admin approval.`);
                    setToast({
                        type: 'success',
                        title: 'Booking request submitted',
                        message: 'Your request is waiting for organizer approval.'
                    });
                }
            }
        } catch (err) {
            const message = err.code === 'ECONNABORTED'
                ? 'The server took too long to respond. Please try again in a moment.'
                : err.response?.data?.message || 'Booking failed';
            setError(message);
            setToast({
                type: 'error',
                title: 'Request failed',
                message
            });
        } finally {
            setBookingLoading(false);
        }
    };

    const seatsPercent = useMemo(() => {
        if (!event?.totalSeats) return 0;
        return Math.max(0, Math.min(100, (event.availableSeats / event.totalSeats) * 100));
    }, [event]);

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
                    <div className="h-80 animate-pulse bg-slate-200 dark:bg-white/10"></div>
                    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
                        <div className="space-y-4">
                            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-white/10"></div>
                            <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-white/10"></div>
                            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-white/10"></div>
                        </div>
                        <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-200 bg-rose-50 p-10 text-center text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                <Toast toast={toast} onClose={() => setToast(null)} />
                <FaInfoCircle className="mx-auto text-4xl" />
                <h1 className="mt-4 text-2xl font-black">Event brief unavailable</h1>
                <p className="mt-2 text-sm font-semibold opacity-80">{error}</p>
                <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white">
                    <FaArrowLeft /> Back to Discover
                </Link>
            </div>
        );
    }

    const isSoldOut = event.availableSeats <= 0;
    const totalPrice = Number(event.ticketPrice || 0) * Number(seatsBooked || 1);

    return (
        <div className="mx-auto max-w-7xl">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <Link to="/" className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
                <FaArrowLeft /> Back to Discover
            </Link>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20">
                <div className="relative min-h-[360px] bg-slate-950">
                    {event.image ? (
                        <img src={event.image} alt={event.title} className="absolute inset-0 h-full w-full object-cover opacity-70" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-6xl font-black uppercase text-white/10">
                            {event.category}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                    <div className="relative flex min-h-[360px] flex-col justify-end p-6 text-white sm:p-8 lg:p-10">
                        <div className="mb-5 flex flex-wrap gap-3">
                            <span className="rounded-full bg-sky-400 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">{event.category}</span>
                            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] backdrop-blur">{formatPrice(event.ticketPrice)}</span>
                        </div>
                        <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{event.title}</h1>
                        <div className="mt-6 grid gap-3 text-sm font-bold text-slate-200 sm:grid-cols-2 lg:max-w-3xl">
                            <p className="flex items-center gap-3"><FaCalendarAlt className="text-sky-300" /> {formatDate(event.date)}</p>
                            <p className="flex items-center gap-3"><FaMapMarkerAlt className="text-sky-300" /> {event.location}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_380px] lg:p-8">
                    <main className="min-w-0">
                        <div className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-100 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-black transition ${activeTab === tab
                                        ? 'bg-slate-950 text-white shadow-lg dark:bg-sky-500'
                                        : 'text-slate-500 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="mt-5 rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5 sm:p-6">
                            {activeTab === 'Overview' && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Event Brief</p>
                                    <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">What to expect</h2>
                                    <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">{event.description}</p>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <DetailMetric icon={FaTicketAlt} label="Ticket" value={formatPrice(event.ticketPrice)} />
                                        <DetailMetric icon={FaChair} label="Available" value={`${event.availableSeats}/${event.totalSeats}`} />
                                        <DetailMetric icon={FaClock} label="Status" value={isSoldOut ? 'Sold Out' : 'Open'} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Venue' && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Venue</p>
                                    <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Arrival details</h2>
                                    <div className="mt-5 grid gap-4">
                                        <InfoRow icon={FaMapMarkerAlt} label="Location" value={event.location} />
                                        <InfoRow icon={FaCalendarAlt} label="Schedule" value={formatDate(event.date)} />
                                        <InfoRow icon={FaShieldAlt} label="Access" value="Entry requests are verified with email OTP and approved by the organizer." />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Booking' && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Secure Request</p>
                                    <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">How booking works</h2>
                                    <div className="mt-5 grid gap-4">
                                        <InfoRow icon={FaLock} label="Step 1" value="Request a one-time code using your verified email account." />
                                        <InfoRow icon={FaReceipt} label="Step 2" value="Enter the OTP to submit your booking request." />
                                        <InfoRow icon={FaCheckCircle} label="Step 3" value="The organizer confirms your request and marks payment status." />
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>

                    <aside className="lg:sticky lg:top-6 lg:self-start">
                        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/30">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Reserve</p>
                                    <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{formatPrice(event.ticketPrice)}</h3>
                                </div>
                                <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-500/15 dark:text-sky-200">
                                    <FaTicketAlt />
                                </div>
                            </div>

                            <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                                    <span>Seat health</span>
                                    <span className={isSoldOut ? 'text-rose-500' : 'text-emerald-500'}>{event.availableSeats} left</span>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                    <div className="h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${seatsPercent}%` }}></div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">Seats to book</label>
                                <div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setSeatsBooked((value) => Math.max(1, Number(value) - 1))}
                                        disabled={showOTP || bookingLoading || seatsBooked <= 1}
                                        className="text-lg font-black text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/10"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max={event.availableSeats}
                                        disabled={showOTP || bookingLoading}
                                        value={seatsBooked}
                                        onChange={(inputEvent) => {
                                            const value = Number(inputEvent.target.value);
                                            if (!inputEvent.target.value) return setSeatsBooked('');
                                            setSeatsBooked(Math.max(1, Math.min(value, event.availableSeats)));
                                        }}
                                        className="border-x border-slate-200 bg-transparent px-3 py-3 text-center text-lg font-black text-slate-950 outline-none dark:border-white/10 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSeatsBooked((value) => Math.min(event.availableSeats, Number(value) + 1))}
                                        disabled={showOTP || bookingLoading || seatsBooked >= event.availableSeats}
                                        className="text-lg font-black text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/10"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center justify-between rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-sky-500/10 dark:text-slate-200">
                                    <span>Total</span>
                                    <span className="text-sky-700 dark:text-sky-200">{formatPrice(totalPrice)}</span>
                                </div>
                            </div>

                            {showOTP && (
                                <div className="mt-5">
                                    <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">Enter secure OTP</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="6-digit code"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-lg font-black tracking-[0.35em] text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-400/20"
                                        value={otp}
                                        onChange={(event) => setOtp(event.target.value)}
                                        maxLength="6"
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleBooking}
                                disabled={isSoldOut || bookingLoading || !seatsBooked || seatsBooked > event.availableSeats || (showOTP && !otp) || (successMsg && !showOTP)}
                                className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition ${isSoldOut || (successMsg && !showOTP)
                                    ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-500'
                                    : 'bg-slate-950 text-white shadow-lg shadow-slate-300 hover:-translate-y-0.5 hover:bg-sky-600 dark:bg-sky-500 dark:shadow-black/20 dark:hover:bg-sky-400'
                                    }`}
                            >
                                {bookingLoading ? 'Processing request...' : (showOTP ? 'Verify OTP & Submit' : (successMsg && !showOTP ? 'Request Submitted' : (isSoldOut ? 'Sold Out' : 'Request Access')))}
                            </button>

                            {error && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-center text-sm font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
                            {successMsg && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{successMsg}</p>}
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
};

const DetailMetric = ({ icon: Icon, label, value }) => (
    <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-950">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-200">
            <Icon />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-950">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sky-600 dark:bg-white/10 dark:text-sky-200">
            <Icon />
        </div>
        <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">{value}</p>
        </div>
    </div>
);

export default EventDetail;
