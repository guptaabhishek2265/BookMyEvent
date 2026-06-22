import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import {
    FaCalendarAlt,
    FaCheckCircle,
    FaEdit,
    FaMapMarkerAlt,
    FaMoneyBillWave,
    FaPlus,
    FaTimes,
    FaTimesCircle,
    FaTrash,
    FaUsers,
    FaChair,
    FaClock,
    FaSearch,
    FaTicketAlt,
    FaUserCircle
} from 'react-icons/fa';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (date) =>
    date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtDate = (date) =>
    date ? new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const fmtMoney = (n) => (Number(n) === 0 ? 'Free' : `Rs. ${Number(n).toLocaleString()}`);

const EMPTY_FORM = {
    title: '', description: '', date: '', location: '',
    category: '', totalSeats: '', ticketPrice: '', image: ''
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [activeAction, setActiveAction] = useState('');

    // tabs: 'bookings' | 'events'
    const [activeTab, setActiveTab] = useState('bookings');

    // booking filters
    const [bookingSearch, setBookingSearch] = useState('');
    const [bookingFilter, setBookingFilter] = useState('pending');

    // event form
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null); // null = create, obj = edit
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // ── Auth guard ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user || user.role !== 'admin') { navigate('/login'); return; }
        fetchData();
    }, [user, navigate]);

    // ── Auto-dismiss toast ────────────────────────────────────────────────────
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(id);
    }, [toast]);

    // ── Data fetch ────────────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            const [evRes, bkRes] = await Promise.all([
                api.get('/events'),
                api.get('/bookings/my')
            ]);
            setEvents(evRes.data);
            setBookings(bkRes.data);
        } catch (err) {
            setToast({ type: 'error', title: 'Failed to load data', message: err.response?.data?.message || 'Check API connection.' });
        } finally {
            setLoading(false);
        }
    };

    // ── Analytics ─────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const confirmed = bookings.filter(b => b.status === 'confirmed');
        const paid = confirmed.filter(b => b.paymentStatus === 'paid');
        const pending = bookings.filter(b => b.status === 'pending');
        const revenue = paid.reduce((s, b) => s + Number(b.amount || 0), 0);
        const paidClients = new Set(paid.map(b => b.userId?._id)).size;
        return { pending: pending.length, revenue, paidClients, total: bookings.length, confirmed: confirmed.length };
    }, [bookings]);

    // ── Filtered bookings ─────────────────────────────────────────────────────
    const filteredBookings = useMemo(() => {
        const q = bookingSearch.toLowerCase();
        return [...bookings]
            .filter(b => {
                const matchStatus = bookingFilter === 'all' || b.status === bookingFilter;
                const matchSearch = !q
                    || b.eventId?.title?.toLowerCase().includes(q)
                    || b.userId?.name?.toLowerCase().includes(q)
                    || b.userId?.email?.toLowerCase().includes(q);
                return matchStatus && matchSearch;
            })
            .sort((a, b) => {
                // pending first, then newest
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
    }, [bookings, bookingSearch, bookingFilter]);

    // ── Event CRUD ────────────────────────────────────────────────────────────
    const openCreateForm = () => {
        setEditingEvent(null);
        setFormData(EMPTY_FORM);
        setShowEventForm(true);
    };

    const openEditForm = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title,
            description: event.description,
            date: event.date ? event.date.slice(0, 10) : '',
            location: event.location,
            category: event.category,
            totalSeats: event.totalSeats,
            ticketPrice: event.ticketPrice,
            image: event.image || ''
        });
        setShowEventForm(true);
        setActiveTab('events');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const closeForm = () => { setShowEventForm(false); setEditingEvent(null); setFormData(EMPTY_FORM); setFormError(''); };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        // Cast numeric fields — form inputs always return strings
        const payload = {
            ...formData,
            totalSeats: Number(formData.totalSeats),
            ticketPrice: Number(formData.ticketPrice),
        };

        try {
            if (editingEvent) {
                await api.put(`/events/${editingEvent._id}`, payload);
                setToast({ type: 'success', title: 'Event updated', message: 'Changes saved successfully.' });
            } else {
                await api.post('/events', payload);
                setToast({ type: 'success', title: 'Event created', message: 'Now visible in Discover.' });
            }
            closeForm();
            fetchData();
        } catch (err) {
            const status = err.response?.status;
            let message = err.response?.data?.message || err.message || 'Unknown error.';
            if (status === 401) message = 'Session expired — please log out and log in again.';
            if (status === 403) message = 'Access denied. Make sure this account has the admin role.';
            if (!err.response) message = 'Cannot reach the server. Make sure the backend is running on port 5000.';
            setFormError(message);
            setToast({ type: 'error', title: editingEvent ? 'Update failed' : 'Create failed', message });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Permanently delete this event?')) return;
        try {
            await api.delete(`/events/${id}`);
            setToast({ type: 'success', title: 'Event deleted', message: 'Removed from all listings.' });
            fetchData();
        } catch (err) {
            setToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message || 'Server error.' });
        }
    };

    // ── Booking actions ───────────────────────────────────────────────────────
    const handleConfirmBooking = async (id, paymentStatus) => {
        const key = `${id}-${paymentStatus}`;
        setActiveAction(key);
        try {
            const { data } = await api.put(`/bookings/${id}/confirm`, { paymentStatus });
            setToast({ type: 'success', title: 'Booking approved', message: data?.message || `Confirmed as ${paymentStatus.replace('_', ' ')}.` });
            await fetchData();
        } catch (err) {
            setToast({ type: 'error', title: 'Approval failed', message: err.response?.data?.message || 'Server error.' });
        } finally {
            setActiveAction('');
        }
    };

    const handleRejectBooking = async (id) => {
        if (!window.confirm("Reject and cancel this booking request?")) return;
        const key = `${id}-reject`;
        setActiveAction(key);
        try {
            const { data } = await api.delete(`/bookings/${id}`);
            setToast({ type: 'success', title: 'Request rejected', message: data?.message || 'Booking cancelled.' });
            await fetchData();
        } catch (err) {
            setToast({ type: 'error', title: 'Reject failed', message: err.response?.data?.message || 'Server error.' });
        } finally {
            setActiveAction('');
        }
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />)}
                </div>
                <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* ── Header ── */}
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-950 p-6 text-white shadow-xl sm:flex-row sm:items-center dark:bg-slate-900">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Gatherly</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-400">Manage events and approve booking requests.</p>
                </div>
                <button
                    type="button"
                    onClick={showEventForm && !editingEvent ? closeForm : openCreateForm}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-sky-50"
                >
                    {showEventForm && !editingEvent ? <><FaTimes /> Cancel</> : <><FaPlus /> Create Event</>}
                </button>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={FaClock} label="Pending" value={stats.pending} tone="yellow" />
                <StatCard icon={FaCheckCircle} label="Confirmed" value={stats.confirmed} tone="green" />
                <StatCard icon={FaMoneyBillWave} label="Revenue" value={`Rs. ${stats.revenue.toLocaleString()}`} tone="indigo" />
                <StatCard icon={FaUsers} label="Paid Clients" value={stats.paidClients} tone="sky" />
            </div>

            {/* ── Event form (create / edit) ── */}
            {showEventForm && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            {editingEvent ? `Edit: ${editingEvent.title}` : 'Create New Event'}
                        </h2>
                        <button type="button" onClick={closeForm} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
                            <FaTimes />
                        </button>
                    </div>
                    <form onSubmit={handleEventSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormInput required label="Event Title" value={formData.title} onChange={v => setFormData(f => ({ ...f, title: v }))} />
                        <FormInput required label="Category" placeholder="e.g. Technology, Music" value={formData.category} onChange={v => setFormData(f => ({ ...f, category: v }))} />
                        <FormInput required type="date" label="Date" value={formData.date} onChange={v => setFormData(f => ({ ...f, date: v }))} />
                        <FormInput required label="Location" value={formData.location} onChange={v => setFormData(f => ({ ...f, location: v }))} />
                        <FormInput required type="number" label="Total Seats" min="1" value={formData.totalSeats} onChange={v => setFormData(f => ({ ...f, totalSeats: v }))} />
                        <FormInput required type="number" label="Ticket Price (0 for free)" min="0" value={formData.ticketPrice} onChange={v => setFormData(f => ({ ...f, ticketPrice: v }))} />
                        <div className="md:col-span-2">
                            <FormInput label="Image URL (optional)" value={formData.image} onChange={v => setFormData(f => ({ ...f, image: v }))} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">Description <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Describe the event..."
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/15 dark:bg-slate-800 dark:text-white dark:focus:ring-sky-400/20"
                                value={formData.description}
                                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-3 md:col-span-2">
                            {formError && (
                                <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    ⚠️ {formError}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 md:col-span-2">
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 rounded-xl bg-slate-950 py-3 text-sm font-black text-white shadow-md transition hover:bg-sky-600 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
                            >
                                {formLoading ? 'Saving...' : (editingEvent ? 'Save Changes' : 'Publish Event')}
                            </button>
                            <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Tab switcher ── */}
            <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <TabBtn active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}>
                    <FaTicketAlt /> Booking Requests
                    {stats.pending > 0 && (
                        <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">
                            {stats.pending}
                        </span>
                    )}
                </TabBtn>
                <TabBtn active={activeTab === 'events'} onClick={() => setActiveTab('events')}>
                    <FaCalendarAlt /> Events
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-black text-slate-700 dark:bg-white/15 dark:text-slate-200">
                        {events.length}
                    </span>
                </TabBtn>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                BOOKINGS PANEL
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'bookings' && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
                    {/* toolbar */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by event, user or email..."
                                value={bookingSearch}
                                onChange={e => setBookingSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-400/20"
                            />
                        </div>
                        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black dark:bg-white/10">
                            {['pending', 'confirmed', 'cancelled', 'all'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setBookingFilter(f)}
                                    className={`rounded-lg px-3 py-2 capitalize transition ${bookingFilter === f ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                                >
                                    {f}
                                    {f === 'pending' && stats.pending > 0 && (
                                        <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-950">
                                            {stats.pending}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* list */}
                    <div className="divide-y divide-slate-100 dark:divide-white/10">
                        {filteredBookings.length === 0 ? (
                            <div className="py-16 text-center">
                                <FaTicketAlt className="mx-auto text-3xl text-slate-300 dark:text-white/20" />
                                <p className="mt-3 font-bold text-slate-500 dark:text-slate-400">No bookings match your filter.</p>
                            </div>
                        ) : (
                            filteredBookings.map(booking => (
                                <BookingRow
                                    key={booking._id}
                                    booking={booking}
                                    activeAction={activeAction}
                                    onApprove={handleConfirmBooking}
                                    onReject={handleRejectBooking}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                EVENTS PANEL
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'events' && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
                    {events.length === 0 ? (
                        <div className="py-16 text-center">
                            <FaCalendarAlt className="mx-auto text-3xl text-slate-300 dark:text-white/20" />
                            <p className="mt-3 font-bold text-slate-500 dark:text-slate-400">No events yet. Create one above.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/10">
                            {events.map(event => (
                                <div key={event._id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/10">
                                            {event.image
                                                ? <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
                                                : <div className="flex h-full w-full items-center justify-center text-xs font-black uppercase text-slate-400">{event.category?.slice(0,3) || 'EV'}</div>
                                            }
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white">{event.title}</h4>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1"><FaCalendarAlt /> {fmtDate(event.date)}</span>
                                                <span className="flex items-center gap-1"><FaMapMarkerAlt /> {event.location}</span>
                                                <span className="flex items-center gap-1"><FaChair /> {event.availableSeats}/{event.totalSeats}</span>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/10">{event.category}</span>
                                                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">{fmtMoney(event.ticketPrice)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEditForm(event)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/15"
                                        >
                                            <FaEdit /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteEvent(event._id)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-500 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500 dark:hover:text-white"
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── BookingRow ───────────────────────────────────────────────────────────────
const BookingRow = ({ booking, activeAction, onApprove, onReject }) => {
    const isPending = booking.status === 'pending';
    const isConfirmed = booking.status === 'confirmed';

    const statusStyles = {
        pending:   'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200',
        confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200',
        cancelled: 'bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200'
    };

    const payStyles = {
        paid:    'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/20 dark:text-indigo-200',
        not_paid: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
    };

    return (
        <div className={`p-5 transition hover:bg-slate-50 dark:hover:bg-white/5 ${isPending ? 'border-l-4 border-l-amber-400' : isConfirmed ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-400'}`}>
            {/* top row: event title + badges */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white">
                        {booking.eventId?.title || <span className="italic text-slate-400">Deleted Event</span>}
                    </h4>
                    {booking.eventId && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <FaCalendarAlt className="shrink-0" /> {fmtDate(booking.eventId.date)}
                            <span className="mx-1 opacity-40">·</span>
                            <FaMapMarkerAlt className="shrink-0" /> {booking.eventId.location}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${statusStyles[booking.status] || statusStyles.pending}`}>
                        {booking.status}
                    </span>
                    {booking.status !== 'cancelled' && (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${payStyles[booking.paymentStatus] || payStyles.not_paid}`}>
                            {booking.paymentStatus.replace('_', ' ')}
                        </span>
                    )}
                </div>
            </div>

            {/* detail grid */}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5 sm:grid-cols-4">
                <InfoBlock icon={FaUserCircle} label="User" value={booking.userId?.name || 'Unknown'} />
                <InfoBlock icon={null} label="Email" value={booking.userId?.email || '—'} />
                <InfoBlock icon={FaChair} label="Booked seats" value={booking.seatsBooked || 1} />
                <InfoBlock icon={FaMoneyBillWave} label="Amount" value={fmtMoney(booking.amount)} />
                <InfoBlock icon={FaClock} label="Requested" value={fmt(booking.createdAt)} />
                {booking.eventId && (
                    <InfoBlock icon={FaChair} label="Seats left" value={`${booking.eventId.availableSeats} / ${booking.eventId.totalSeats}`} />
                )}
            </div>

            {/* action buttons — only for pending */}
            {isPending && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={Boolean(activeAction)}
                        onClick={() => onApprove(booking._id, 'paid')}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-600 dark:hover:text-white"
                    >
                        <FaCheckCircle />
                        {activeAction === `${booking._id}-paid` ? 'Approving…' : 'Approve as Paid'}
                    </button>
                    <button
                        type="button"
                        disabled={Boolean(activeAction)}
                        onClick={() => onReject(booking._id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white"
                    >
                        <FaTimesCircle />
                        {activeAction === `${booking._id}-reject` ? 'Rejecting…' : 'Reject'}
                    </button>
                </div>
            )}

            {/* confirmed notice */}
            {isConfirmed && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <FaCheckCircle className="shrink-0" />
                    Approved — payment: <strong className="capitalize">{booking.paymentStatus.replace('_', ' ')}</strong>
                </div>
            )}

            {/* cancelled notice */}
            {booking.status === 'cancelled' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <FaTimesCircle className="shrink-0" />
                    Rejected / cancelled
                </div>
            )}
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, tone }) => {
    const tones = {
        yellow: 'bg-amber-400 text-slate-950',
        green:  'bg-emerald-500 text-white',
        indigo: 'bg-indigo-500 text-white',
        sky:    'bg-sky-500 text-white'
    };
    return (
        <div className={`${tones[tone]} flex items-center justify-between rounded-2xl p-5 shadow-lg`}>
            <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
            </div>
            <Icon className="text-3xl opacity-30" />
        </div>
    );
};

const TabBtn = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition ${active
            ? 'bg-slate-950 text-white shadow-lg dark:bg-sky-500'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
        }`}
    >
        {children}
    </button>
);

const FormInput = ({ label, required, type = 'text', placeholder, value, onChange, min }) => (
    <div>
        <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            required={required}
            placeholder={placeholder || label}
            min={min}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/15 dark:bg-slate-800 dark:text-white dark:focus:ring-sky-400/20"
        />
    </div>
);

const InfoBlock = ({ icon: Icon, label, value }) => (
    <div>
        <p className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 truncate">
            {Icon && <Icon className="shrink-0 text-sky-500" />} {value}
        </p>
    </div>
);

export default AdminDashboard;
