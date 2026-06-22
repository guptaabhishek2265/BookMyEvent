import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import Toast from '../components/Toast';
import {
    FaArrowRight,
    FaCalendarAlt,
    FaChair,
    FaFilter,
    FaMapMarkerAlt,
    FaRegCalendarCheck,
    FaSearch,
    FaMagic,
    FaTicketAlt,
    FaUsers
} from 'react-icons/fa';

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
});

const formatPrice = (price) => (Number(price) === 0 ? 'Free' : `Rs. ${Number(price).toLocaleString()}`);

const Home = () => {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchEvents();
        }, 350);
        return () => clearTimeout(timeoutId);
    }, [search]);

    useEffect(() => {
        if (!toast) return undefined;
        const timeoutId = setTimeout(() => setToast(null), 3600);
        return () => clearTimeout(timeoutId);
    }, [toast]);

    const fetchEvents = async () => {
        try {
            const { data } = await api.get(`/events?search=${encodeURIComponent(search)}`);
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            setToast({
                type: 'error',
                title: 'Events could not be loaded',
                message: 'Please check the API connection and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const unique = [...new Set(events.map((event) => event.category).filter(Boolean))];
        return ['All', ...unique];
    }, [events]);

    const visibleEvents = useMemo(() => {
        if (category === 'All') return events;
        return events.filter((event) => event.category === category);
    }, [events, category]);

    const stats = useMemo(() => {
        const totalSeats = events.reduce((sum, event) => sum + Number(event.totalSeats || 0), 0);
        const availableSeats = events.reduce((sum, event) => sum + Number(event.availableSeats || 0), 0);
        const freeEvents = events.filter((event) => Number(event.ticketPrice) === 0).length;

        return [
            { label: 'Live Events', value: events.length, icon: FaRegCalendarCheck, tone: 'bg-sky-500' },
            { label: 'Open Seats', value: availableSeats, icon: FaChair, tone: 'bg-emerald-500' },
            { label: 'Free Access', value: freeEvents, icon: FaTicketAlt, tone: 'bg-amber-400' },
            { label: 'Total Capacity', value: totalSeats, icon: FaUsers, tone: 'bg-indigo-500' }
        ];
    }, [events]);

    return (
        <div className="mx-auto max-w-7xl">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20">
                <div className="grid gap-0 xl:grid-cols-[360px_1fr]">
                    <aside className="border-b border-slate-200 bg-slate-950 p-6 text-white dark:border-white/10 xl:border-b-0 xl:border-r">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                            <FaMagic /> Gatherly Discover
                        </div>
                        <h1 className="mt-8 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                            Discover events worth showing up for.
                        </h1>
                        <p className="mt-4 text-sm leading-6 text-slate-300">
                            Browse curated concerts, conferences, workshops, and community gatherings with clear availability and secure access requests.
                        </p>

                        <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quick Search</p>
                            <div className="relative mt-3">
                                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by event name"
                                    className="w-full rounded-2xl border border-white/10 bg-white px-11 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-300/20"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>
                    </aside>

                    <div className="p-5 sm:p-6 lg:p-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Event Dashboard</p>
                                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Explore active listings</h2>
                                <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Filter by category, inspect availability, and open any listing for a deeper event brief.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                {visibleEvents.length} result{visibleEvents.length === 1 ? '' : 's'} shown
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {stats.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={stat.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone} text-white shadow-lg`}>
                                            <Icon />
                                        </div>
                                        <p className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{Number(stat.value).toLocaleString()}</p>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5 lg:flex-row lg:items-center">
                            <div className="flex items-center gap-2 px-2 text-sm font-black text-slate-500 dark:text-slate-300">
                                <FaFilter className="text-sky-500" /> Categories
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                                {categories.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setCategory(item)}
                                        className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition ${category === item
                                            ? 'bg-slate-950 text-white shadow-lg dark:bg-sky-500'
                                            : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <EventSkeleton />
                        ) : visibleEvents.length === 0 ? (
                            <EmptyEvents search={search} />
                        ) : (
                            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                                {visibleEvents.map((event) => (
                                    <EventCard key={event._id} event={event} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

const EventCard = ({ event }) => {
    const seatsPercent = event.totalSeats ? Math.max(0, Math.min(100, (event.availableSeats / event.totalSeats) * 100)) : 0;
    const isSoldOut = event.availableSeats <= 0;

    return (
        <article className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/80 dark:border-white/10 dark:bg-slate-950 dark:hover:shadow-black/40">
            <div className="relative h-56 overflow-hidden bg-slate-200 dark:bg-slate-800">
                {event.image ? (
                    <img src={event.image} alt={event.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black uppercase text-slate-400">
                        {event.category || 'Event'}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"></div>
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg backdrop-blur">
                    {event.category || 'Featured'}
                </div>
                <div className="absolute right-4 top-4 rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-black text-white shadow-lg backdrop-blur">
                    {formatPrice(event.ticketPrice)}
                </div>
                <h3 className="absolute bottom-4 left-4 right-4 text-2xl font-black leading-tight text-white">{event.title}</h3>
            </div>

            <div className="p-5">
                <div className="grid gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-3"><FaCalendarAlt className="text-sky-500" /> {formatDate(event.date)}</p>
                    <p className="flex items-center gap-3"><FaMapMarkerAlt className="text-sky-500" /> {event.location}</p>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                        <span>Seat availability</span>
                        <span className={isSoldOut ? 'text-rose-500' : 'text-emerald-500'}>
                            {isSoldOut ? 'Sold out' : `${event.availableSeats}/${event.totalSeats}`}
                        </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${seatsPercent}%` }}></div>
                    </div>
                </div>

                <Link
                    to={`/events/${event._id}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-600 dark:bg-white dark:text-slate-950 dark:hover:bg-sky-300"
                >
                    View Event Brief <FaArrowRight />
                </Link>
            </div>
        </article>
    );
};

const EventSkeleton = () => (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
                <div className="h-56 animate-pulse bg-slate-200 dark:bg-white/10"></div>
                <div className="space-y-4 p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-white/10"></div>
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-white/10"></div>
                    <div className="h-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10"></div>
                </div>
            </div>
        ))}
    </div>
);

const EmptyEvents = ({ search }) => (
    <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-white/15 dark:bg-white/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl text-sky-500 shadow-sm dark:bg-white/10">
            <FaSearch />
        </div>
        <h3 className="mt-5 text-xl font-black text-slate-950 dark:text-white">No matching events</h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
            {search ? `No listings match "${search}". Try another keyword or category.` : 'There are no active listings yet. Please check back soon.'}
        </p>
    </div>
);

export default Home;
