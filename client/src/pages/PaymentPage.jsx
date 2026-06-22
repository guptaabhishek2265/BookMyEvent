import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import {
    FaArrowLeft,
    FaChair,
    FaCheckCircle,
    FaCreditCard,
    FaLock,
    FaShieldAlt,
    FaTicketAlt,
    FaSpinner
} from 'react-icons/fa';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtMoney = (n) => `Rs. ${Number(n).toLocaleString()}`;

const formatCardNumber = (v) =>
    v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (v) => {
    const raw = v.replace(/\D/g, '').slice(0, 4);
    return raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
};

/* ─── Card brand detection ────────────────────────────────────────────────── */
const detectBrand = (number) => {
    const n = number.replace(/\s/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^6/.test(n)) return 'Rupay';
    return null;
};

/* ─── Component ───────────────────────────────────────────────────────────── */
const PaymentPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [booking, setBooking] = useState(null);
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [fetchError, setFetchError] = useState('');

    // form state
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [errors, setErrors] = useState({});

    // payment state
    const [paying, setPaying] = useState(false);
    const [success, setSuccess] = useState(false);

    /* auth guard */
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    /* fetch booking details */
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('/bookings/my');
                const found = data.find((b) => b._id === bookingId);
                if (!found) { setFetchError('Booking not found.'); return; }
                if (found.paymentStatus === 'paid') { navigate('/dashboard'); return; }
                if (found.status === 'cancelled') { setFetchError('This booking has been cancelled.'); return; }
                setBooking(found);
            } catch {
                setFetchError('Could not load booking details.');
            } finally {
                setLoadingBooking(false);
            }
        };
        load();
    }, [bookingId, navigate]);

    /* validation */
    const validate = () => {
        const e = {};
        const rawCard = cardNumber.replace(/\s/g, '');
        if (!rawCard || rawCard.length < 12) e.cardNumber = 'Enter a valid card number.';
        if (!cardName.trim()) e.cardName = 'Cardholder name is required.';
        const [mm, yy] = expiry.split('/');
        if (!mm || !yy || Number(mm) < 1 || Number(mm) > 12) e.expiry = 'Use MM/YY format.';
        else {
            const now = new Date();
            const exp = new Date(2000 + Number(yy), Number(mm) - 1);
            if (exp < now) e.expiry = 'Card has expired.';
        }
        if (!cvv || cvv.length < 3) e.cvv = 'Enter a valid CVV.';
        return e;
    };

    const handlePay = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setPaying(true);

        /* simulate network delay for realistic feel */
        await new Promise((r) => setTimeout(r, 1400));

        try {
            await api.put(`/bookings/${bookingId}/pay`);
            setSuccess(true);
        } catch (err) {
            setErrors({ submit: err.response?.data?.message || 'Payment failed. Please try again.' });
        } finally {
            setPaying(false);
        }
    };

    /* ── loading ─────────────────────────────────────────────────────────── */
    if (loadingBooking) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-sky-500" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
                <p className="font-black text-rose-700 dark:text-rose-200">{fetchError}</p>
                <Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700">
                    <FaArrowLeft /> Go to Dashboard
                </Link>
            </div>
        );
    }

    /* ── success screen ──────────────────────────────────────────────────── */
    if (success) {
        return (
            <div className="mx-auto max-w-md">
                <div className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-2xl dark:border-emerald-500/30 dark:bg-slate-900">
                    <div className="bg-emerald-500 px-6 py-10 text-center text-white">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                            <FaCheckCircle className="text-4xl" />
                        </div>
                        <h1 className="mt-4 text-3xl font-black">Payment Successful!</h1>
                        <p className="mt-2 text-emerald-100">Your payment has been recorded.</p>
                    </div>
                    <div className="p-6">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-500 dark:text-slate-400">Event</span>
                                <span className="font-black text-slate-900 dark:text-white">{booking?.eventId?.title}</span>
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="font-bold text-slate-500 dark:text-slate-400">Seats</span>
                                <span className="font-black text-slate-900 dark:text-white">{booking?.seatsBooked || 1}</span>
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="font-bold text-slate-500 dark:text-slate-400">Amount paid</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-300">{fmtMoney(booking?.amount)}</span>
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="font-bold text-slate-500 dark:text-slate-400">Status</span>
                                <span className="font-black text-amber-600 dark:text-amber-300">Awaiting admin approval</span>
                            </div>
                        </div>
                        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            Your booking is in the queue. The admin will confirm it shortly and you'll receive a confirmation email.
                        </p>
                        <Link
                            to="/dashboard"
                            className="mt-5 block w-full rounded-2xl bg-slate-950 py-4 text-center text-sm font-black text-white transition hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-400"
                        >
                            View My Bookings
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const brand = detectBrand(cardNumber);
    const rawCard = cardNumber.replace(/\s/g, '');

    /* ── payment form ────────────────────────────────────────────────────── */
    return (
        <div className="mx-auto max-w-xl">
            <Link
                to="/dashboard"
                className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            >
                <FaArrowLeft /> Back
            </Link>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
                {/* header */}
                <div className="bg-slate-950 px-6 py-5 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Secure Checkout</p>
                            <h1 className="mt-1 text-xl font-black text-white">{booking?.eventId?.title}</h1>
                        </div>
                        <div className="rounded-2xl bg-sky-400/20 p-3 text-sky-300">
                            <FaTicketAlt className="text-xl" />
                        </div>
                    </div>

                    {/* amount banner */}
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
                            <FaChair /> {booking?.seatsBooked || 1} seat{(booking?.seatsBooked || 1) === 1 ? '' : 's'}
                        </span>
                        <span className="text-2xl font-black text-white">{fmtMoney(booking?.amount)}</span>
                    </div>
                </div>

                {/* card preview */}
                <div className="px-6 pt-6">
                    <div className="relative h-44 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-xl">
                        <div className="absolute right-4 top-4 h-10 w-16 rounded-md bg-amber-400/80" />
                        <div className="absolute right-10 top-4 h-10 w-10 rounded-full bg-rose-500/60" />
                        <div className="absolute -bottom-6 -left-6 h-36 w-36 rounded-full bg-sky-400/10" />
                        <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-indigo-500/10" />

                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <FaCreditCard className="text-slate-400" />
                                {brand && <span className="text-xs font-black text-slate-300">{brand}</span>}
                            </div>
                            <p className="mt-6 font-mono text-xl font-black tracking-[0.22em] text-white">
                                {rawCard.length > 0
                                    ? cardNumber.padEnd(19, ' ').replace(/(.{4} ?)(.{4} ?)(.{4} ?)(.{4}?)/, (_, a, b, c, d) =>
                                        `${a} ${b} ${c} ${d}`.trim())
                                    : '•••• •••• •••• ••••'}
                            </p>
                            <div className="mt-4 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card holder</p>
                                    <p className="text-sm font-black text-white">{cardName || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expires</p>
                                    <p className="text-sm font-black text-white">{expiry || 'MM/YY'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* form */}
                <form onSubmit={handlePay} className="space-y-4 p-6">
                    {/* card number */}
                    <div>
                        <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">
                            Card Number
                        </label>
                        <div className="relative">
                            <FaCreditCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="1234 5678 9012 3456"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                maxLength={23}
                                className={`w-full rounded-xl border py-3 pl-11 pr-4 font-mono text-sm font-bold tracking-widest outline-none transition focus:ring-4 ${errors.cardNumber ? 'border-rose-400 bg-rose-50 focus:ring-rose-100 dark:bg-rose-500/10' : 'border-slate-200 bg-slate-50 focus:border-sky-400 focus:bg-white focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-400/20'}`}
                            />
                        </div>
                        {errors.cardNumber && <p className="mt-1 text-xs font-bold text-rose-500">{errors.cardNumber}</p>}
                    </div>

                    {/* card name */}
                    <div>
                        <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">
                            Cardholder Name
                        </label>
                        <input
                            type="text"
                            placeholder="Name on card"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            className={`w-full rounded-xl border py-3 px-4 text-sm font-bold outline-none transition focus:ring-4 ${errors.cardName ? 'border-rose-400 bg-rose-50 focus:ring-rose-100 dark:bg-rose-500/10' : 'border-slate-200 bg-slate-50 focus:border-sky-400 focus:bg-white focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-400/20'}`}
                        />
                        {errors.cardName && <p className="mt-1 text-xs font-bold text-rose-500">{errors.cardName}</p>}
                    </div>

                    {/* expiry + cvv */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">
                                Expiry
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="MM/YY"
                                value={expiry}
                                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                maxLength={5}
                                className={`w-full rounded-xl border py-3 px-4 text-sm font-bold outline-none transition focus:ring-4 ${errors.expiry ? 'border-rose-400 bg-rose-50 focus:ring-rose-100 dark:bg-rose-500/10' : 'border-slate-200 bg-slate-50 focus:border-sky-400 focus:bg-white focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-400/20'}`}
                            />
                            {errors.expiry && <p className="mt-1 text-xs font-bold text-rose-500">{errors.expiry}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">
                                CVV
                            </label>
                            <input
                                type="password"
                                inputMode="numeric"
                                placeholder="•••"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                maxLength={4}
                                className={`w-full rounded-xl border py-3 px-4 text-sm font-bold outline-none transition focus:ring-4 ${errors.cvv ? 'border-rose-400 bg-rose-50 focus:ring-rose-100 dark:bg-rose-500/10' : 'border-slate-200 bg-slate-50 focus:border-sky-400 focus:bg-white focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-400/20'}`}
                            />
                            {errors.cvv && <p className="mt-1 text-xs font-bold text-rose-500">{errors.cvv}</p>}
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                            {errors.submit}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={paying}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-500 dark:hover:bg-sky-400"
                    >
                        {paying ? (
                            <><FaSpinner className="animate-spin" /> Processing…</>
                        ) : (
                            <><FaLock /> Pay {fmtMoney(booking?.amount)}</>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                        <FaShieldAlt className="text-emerald-500" />
                        256-bit SSL encrypted · Simulated payment
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentPage;
