import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaArrowRight,
    FaCalendarAlt,
    FaChartPie,
    FaCheckCircle,
    FaChevronRight,
    FaClock,
    FaCompass,
    FaCreditCard,
    FaLayerGroup,
    FaMapMarkerAlt,
    FaRegCalendarCheck,
    FaRupeeSign,
    FaSearch,
    FaShieldAlt,
    FaTimesCircle,
    FaTicketAlt,
    FaUserCircle,
    FaWallet
} from 'react-icons/fa';

const statusStyles = {
    confirmed: {
        label: 'Confirmed',
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        ring: 'ring-emerald-200',
        dot: 'bg-emerald-500',
        icon: FaCheckCircle
    },
    pending: {
        label: 'Pending',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        ring: 'ring-amber-200',
        dot: 'bg-amber-500',
        icon: FaClock
    },
    cancelled: {
        label: 'Cancelled',
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        ring: 'ring-rose-200',
        dot: 'bg-rose-500',
        icon: FaTimesCircle
    }
};

const paymentStyles = {
    paid: 'bg-sky-50 text-sky-700 ring-sky-200',
    not_paid: 'bg-amber-50 text-amber-700 ring-amber-200'
};

const formatDate = (date, options = {}) => {
    if (!date) return 'Unavailable';
    return new Date(date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options
    });
};

const formatAmount = (amount) => {
    if (!amount) return 'Free';
    return `Rs. ${Number(amount).toLocaleString()}`;
};

const UserDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchBookings();
    }, [user, navigate]);

    const fetchBookings = async () => {
        try {
            const { data } = await api.get('/bookings/my');
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings', error);
        } finally {
            setLoading(false);
        }
    };

    const cancelBooking = async (id) => {
        if (window.confirm('Are you sure you want to cancel this booking request?')) {
            try {
                await api.delete(`/bookings/${id}`);
                fetchBookings();
            } catch (error) {
                alert(error.response?.data?.message || 'Error cancelling booking');
            }
        }
    };

    const stats = useMemo(() => {
        const confirmed = bookings.filter((booking) => booking.status === 'confirmed');
        const pending = bookings.filter((booking) => booking.status === 'pending');
        const cancelled = bookings.filter((booking) => booking.status === 'cancelled');
        const paid = bookings.filter((booking) => booking.status === 'confirmed' && booking.paymentStatus === 'paid');
        const upcoming = bookings
            .filter((booking) => booking.eventId && booking.status !== 'cancelled')
            .sort((a, b) => new Date(a.eventId.date) - new Date(b.eventId.date))[0];

        return {
            total: bookings.length,
            confirmed: confirmed.length,
            pending: pending.length,
            cancelled: cancelled.length,
            paid: paid.length,
            spend: paid.reduce((sum, booking) => sum + Number(booking.amount || 0), 0),
            upcoming
        };
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        return bookings.filter((booking) => {
            const eventTitle = booking.eventId?.title?.toLowerCase() || '';
            const location = booking.eventId?.location?.toLowerCase() || '';
            const searchValue = query.toLowerCase();
            const matchesSearch = eventTitle.includes(searchValue) || location.includes(searchValue);
            const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [bookings, query, statusFilter]);

    const chartSegments = [
        { key: 'confirmed', label: 'Confirmed', value: stats.confirmed, color: 'bg-emerald-500' },
        { key: 'pending', label: 'Pending', value: stats.pending, color: 'bg-amber-500' },
        { key: 'cancelled', label: 'Cancelled', value: stats.cancelled, color: 'bg-rose-500' }
    ];

    if (loading) {
        return (
            <div className="min-h-[70vh] rounded-[2rem] bg-slate-950 px-6 py-12 text-white shadow-2xl">
                <div className="mx-auto flex max-w-5xl flex-col gap-6">
                    <div className="h-8 w-56 animate-pulse rounded-full bg-white/10"></div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-36 animate-pulse rounded-3xl bg-white/10"></div>
                        ))}
                    </div>
                    <div className="h-80 animate-pulse rounded-3xl bg-white/10"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-slate-900 shadow-2xl shadow-slate-300/70">
            <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(16,185,129,0.2),transparent_28%)]"></div>

            <div className="relative grid min-h-[82vh] grid-cols-1 lg:grid-cols-[280px_1fr]">
                <aside className="border-b border-white/10 bg-white/[0.04] p-5 text-white backdrop-blur-xl lg:border-b-0 lg:border-r">
                    <div className="flex items-center justify-between lg:block">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">Gatherly</p>
                            <h1 className="mt-2 text-2xl font-black tracking-tight">Ticket Hub</h1>
                        </div>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50 lg:hidden"
                        >
                            Browse <FaArrowRight />
                        </Link>
                    </div>

                    <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-300 text-xl font-black text-slate-950">
                                {user?.name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{user?.name}</p>
                                <p className="truncate text-xs text-slate-300">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <nav className="mt-8 grid gap-2 text-sm font-semibold">
                        {[
                            { label: 'Overview', icon: FaLayerGroup, active: true },
                            { label: 'Bookings', icon: FaTicketAlt },
                            { label: 'Schedule', icon: FaCalendarAlt },
                            { label: 'Security', icon: FaShieldAlt }
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left transition ${item.active
                                        ? 'bg-white text-slate-950 shadow-lg shadow-sky-950/20'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <span className="flex items-center gap-3">
                                        <Icon />
                                        {item.label}
                                    </span>
                                    {item.active && <FaChevronRight className="text-xs text-slate-500" />}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-8 hidden rounded-3xl border border-sky-300/20 bg-sky-300/10 p-5 text-sm text-sky-50 lg:block">
                        <FaCompass className="mb-4 text-2xl text-sky-200" />
                        <p className="font-bold">Discover your next experience</p>
                        <p className="mt-2 text-sky-100/70">Explore live events and submit a secure OTP-protected request.</p>
                        <Link
                            to="/"
                            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-sky-300 px-4 py-2 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-white"
                        >
                            Browse Events <FaArrowRight />
                        </Link>
                    </div>
                </aside>

                <section className="min-w-0 bg-slate-100/95 p-4 sm:p-6 lg:p-8">
                    <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white bg-white/80 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                                <span>Dashboard</span>
                                <FaChevronRight className="text-[10px]" />
                                <span className="text-slate-900">Overview</span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h2>
                            <p className="mt-1 text-sm text-slate-500">Track requests, confirmations, payment status, and upcoming events from one workspace.</p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-lg shadow-slate-300">
                                <FaUserCircle className="text-sky-300" />
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account</p>
                                    <p className="text-sm font-bold capitalize">{user?.role}</p>
                                </div>
                            </div>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-600"
                            >
                                New Booking <FaArrowRight />
                            </Link>
                        </div>
                    </header>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard icon={FaTicketAlt} label="Total Requests" value={stats.total} caption="All booking records" tone="slate" />
                        <MetricCard icon={FaRegCalendarCheck} label="Confirmed" value={stats.confirmed} caption="Approved by admin" tone="emerald" />
                        <MetricCard icon={FaClock} label="Pending Review" value={stats.pending} caption="Waiting for approval" tone="amber" />
                        <MetricCard icon={FaWallet} label="Paid Spend" value={formatAmount(stats.spend)} caption={`${stats.paid} paid booking${stats.paid === 1 ? '' : 's'}`} tone="sky" />
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Booking Health</p>
                                    <h3 className="mt-1 text-xl font-black text-slate-950">Request distribution</h3>
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                                    <FaChartPie className="text-sky-500" />
                                    Live from API
                                </div>
                            </div>

                            <div className="mt-8 grid items-end gap-5 sm:grid-cols-3">
                                {chartSegments.map((segment) => {
                                    const height = stats.total ? Math.max((segment.value / stats.total) * 100, segment.value ? 18 : 6) : 6;
                                    return (
                                        <div key={segment.key} className="group rounded-3xl bg-slate-50 p-4 transition hover:-translate-y-1 hover:bg-slate-100">
                                            <div className="flex h-44 items-end rounded-2xl bg-white p-3 shadow-inner">
                                                <div
                                                    className={`w-full rounded-2xl ${segment.color} transition-all duration-700 ease-out group-hover:brightness-110`}
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-600">{segment.label}</span>
                                                <span className="text-2xl font-black text-slate-950">{segment.value}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-xl shadow-slate-300">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">Next Up</p>
                            {stats.upcoming?.eventId ? (
                                <div className="mt-5">
                                    <div className="overflow-hidden rounded-3xl bg-slate-900">
                                        {stats.upcoming.eventId.image ? (
                                            <img src={stats.upcoming.eventId.image} alt={stats.upcoming.eventId.title} className="h-44 w-full object-cover" />
                                        ) : (
                                            <div className="flex h-44 items-center justify-center bg-sky-400/10 text-4xl font-black uppercase text-sky-100">
                                                {stats.upcoming.eventId.category || 'Event'}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-5 text-2xl font-black leading-tight">{stats.upcoming.eventId.title}</h3>
                                    <div className="mt-4 grid gap-3 text-sm text-slate-300">
                                        <p className="flex items-center gap-3"><FaCalendarAlt className="text-sky-300" /> {formatDate(stats.upcoming.eventId.date, { weekday: 'short' })}</p>
                                        <p className="flex items-center gap-3"><FaMapMarkerAlt className="text-sky-300" /> {stats.upcoming.eventId.location}</p>
                                    </div>
                                    <Link
                                        to={`/events/${stats.upcoming.eventId._id}`}
                                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-100"
                                    >
                                        Open Event <FaArrowRight />
                                    </Link>
                                </div>
                            ) : (
                                <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
                                    <FaCalendarAlt className="mx-auto text-4xl text-sky-200" />
                                    <h3 className="mt-4 text-xl font-black">No active events yet</h3>
                                    <p className="mt-2 text-sm text-slate-400">Start with a new booking request to build your schedule.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 rounded-[1.75rem] border border-white bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Bookings</p>
                                <h3 className="mt-1 text-xl font-black text-slate-950">Your request ledger</h3>
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row">
                                <div className="relative">
                                    <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search bookings"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 md:w-72"
                                    />
                                </div>
                                <div className="grid grid-cols-4 rounded-2xl bg-slate-100 p-1 text-xs font-black text-slate-500">
                                    {['all', 'confirmed', 'pending', 'cancelled'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={`rounded-xl px-3 py-2 capitalize transition ${statusFilter === status ? 'bg-white text-slate-950 shadow-sm' : 'hover:text-slate-900'}`}
                                        >
                                            {status === 'all' ? 'All' : status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {bookings.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <>
                                <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-100 lg:block">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-5 py-4">Event</th>
                                                <th className="px-5 py-4">Date</th>
                                                <th className="px-5 py-4">Status</th>
                                                <th className="px-5 py-4">Payment</th>
                                                <th className="px-5 py-4">Amount</th>
                                                <th className="px-5 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBookings.map((booking) => (
                                                <BookingRow key={booking._id} booking={booking} cancelBooking={cancelBooking} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-5 grid gap-4 lg:hidden">
                                    {filteredBookings.map((booking) => (
                                        <BookingCard key={booking._id} booking={booking} cancelBooking={cancelBooking} />
                                    ))}
                                </div>

                                {filteredBookings.length === 0 && (
                                    <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                                        <p className="font-bold text-slate-700">No bookings match your filters.</p>
                                        <p className="mt-1 text-sm text-slate-500">Try a different status or search term.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

const MetricCard = ({ icon: Icon, label, value, caption, tone }) => {
    const tones = {
        slate: 'bg-slate-950 text-white shadow-slate-300',
        emerald: 'bg-emerald-500 text-white shadow-emerald-100',
        amber: 'bg-amber-400 text-slate-950 shadow-amber-100',
        sky: 'bg-sky-500 text-white shadow-sky-100'
    };

    return (
        <div className={`${tones[tone]} rounded-[1.5rem] p-5 shadow-lg transition hover:-translate-y-1`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">{label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
                    <p className="mt-1 text-sm font-semibold opacity-75">{caption}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                    <Icon />
                </div>
            </div>
        </div>
    );
};

const BookingRow = ({ booking, cancelBooking }) => {
    const status = statusStyles[booking.status] || statusStyles.pending;
    const StatusIcon = status.icon;

    return (
        <tr className="bg-white transition hover:bg-slate-50">
            <td className="px-5 py-4">
                {booking.eventId ? (
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                            {booking.eventId.image ? (
                                <img src={booking.eventId.image} alt={booking.eventId.title} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-500">{booking.eventId.category || 'EV'}</div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-slate-950">{booking.eventId.title}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                                <FaMapMarkerAlt /> {booking.eventId.location}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="font-bold italic text-rose-500">Event details unavailable</p>
                )}
            </td>
            <td className="px-5 py-4 font-bold text-slate-600">{formatDate(booking.eventId?.date)}</td>
            <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${status.bg} ${status.text} ${status.ring}`}>
                    <StatusIcon /> {status.label}
                </span>
            </td>
            <td className="px-5 py-4">
                {booking.status !== 'cancelled' ? (
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black capitalize ring-1 ${paymentStyles[booking.paymentStatus] || paymentStyles.not_paid}`}>
                        {booking.paymentStatus.replace('_', ' ')}
                    </span>
                ) : (
                    <span className="text-xs font-bold text-slate-400">Not applicable</span>
                )}
            </td>
            <td className="px-5 py-4 font-black text-slate-950">{formatAmount(booking.amount)}</td>
            <td className="px-5 py-4 text-right">
                <BookingActions booking={booking} cancelBooking={cancelBooking} compact />
            </td>
        </tr>
    );
};

const BookingCard = ({ booking, cancelBooking }) => {
    const status = statusStyles[booking.status] || statusStyles.pending;

    return (
        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
            <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-white">
                    {booking.eventId?.image ? (
                        <img src={booking.eventId.image} alt={booking.eventId.title} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-500">{booking.eventId?.category || 'EV'}</div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <h4 className="font-black leading-tight text-slate-950">{booking.eventId?.title || 'Deleted Event'}</h4>
                        <span className={`h-3 w-3 shrink-0 rounded-full ${status.dot}`}></span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{formatDate(booking.eventId?.date)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${status.bg} ${status.text} ${status.ring}`}>{status.label}</span>
                        {booking.status !== 'cancelled' && (
                            <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${paymentStyles[booking.paymentStatus] || paymentStyles.not_paid}`}>
                                {booking.paymentStatus.replace('_', ' ')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <FaRupeeSign className="text-sky-500" />
                    {formatAmount(booking.amount)}
                </div>
                <BookingActions booking={booking} cancelBooking={cancelBooking} />
            </div>
        </article>
    );
};

const BookingActions = ({ booking, cancelBooking, compact = false }) => {
    if (!booking.eventId || booking.status === 'cancelled') {
        return <span className="text-xs font-bold text-slate-400">Closed</span>;
    }

    const needsPayment =
        booking.status === 'pending' &&
        booking.paymentStatus === 'not_paid' &&
        Number(booking.amount) > 0;

    return (
        <div className={`inline-flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-2'}`}>
            {needsPayment && (
                <Link
                    to={`/payment/${booking._id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-600"
                >
                    <FaCreditCard /> Pay Now
                </Link>
            )}
            <Link
                to={`/events/${booking.eventId._id}`}
                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-600"
            >
                View
            </Link>
            {booking.status === 'pending' && (
                <button
                    onClick={() => cancelBooking(booking._id)}
                    className="rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-600 ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-600 hover:text-white"
                >
                    Cancel
                </button>
            )}
        </div>
    );
};

const EmptyState = () => (
    <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl text-sky-500 shadow-sm">
            <FaTicketAlt />
        </div>
        <h3 className="mt-5 text-xl font-black text-slate-950">Your booking hub is ready</h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
            Browse events, request a ticket with OTP verification, and your activity will appear here.
        </p>
        <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-600"
        >
            Browse Events <FaArrowRight />
        </Link>
    </div>
);

export default UserDashboard;
