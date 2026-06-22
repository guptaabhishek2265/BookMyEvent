import React, { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    FaCalendarCheck,
    FaChevronRight,
    FaHome,
    FaMoon,
    FaSignInAlt,
    FaSignOutAlt,
    FaSun,
    FaTicketAlt,
    FaUserPlus
} from 'react-icons/fa';

const navLinkClass = ({ isActive }) =>
    `flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition ${isActive
        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
    }`;

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gatherly-theme') === 'dark');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('gatherly-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const dashboardPath = user?.role === 'admin' ? '/admin' : '/dashboard';

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/90 p-5 shadow-2xl shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/20 lg:flex lg:flex-col">
                <Link to="/" className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
                        <FaCalendarCheck />
                    </span>
                    <span>
                        <span className="block text-lg font-black tracking-tight">Gatherly</span>
                        <span className="block text-xs font-bold uppercase tracking-[0.22em] opacity-60">Event OS</span>
                    </span>
                </Link>

                <nav className="mt-8 grid gap-2">
                    <NavLink to="/" className={navLinkClass} end>
                        <span className="flex items-center gap-3"><FaHome /> Discover</span>
                        <FaChevronRight className="text-xs opacity-50" />
                    </NavLink>
                    {user && (
                        <NavLink to={dashboardPath} className={navLinkClass}>
                            <span className="flex items-center gap-3"><FaTicketAlt /> My Workspace</span>
                            <FaChevronRight className="text-xs opacity-50" />
                        </NavLink>
                    )}
                    {!user && (
                        <>
                            <NavLink to="/login" className={navLinkClass}>
                                <span className="flex items-center gap-3"><FaSignInAlt /> Sign In</span>
                            </NavLink>
                            <NavLink to="/register" className={navLinkClass}>
                                <span className="flex items-center gap-3"><FaUserPlus /> Create Account</span>
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="mt-auto grid gap-3">
                    <button
                        type="button"
                        onClick={() => setDarkMode((value) => !value)}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        <span className="flex items-center gap-3">{darkMode ? <FaSun /> : <FaMoon />} {darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    {user && (
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500"
                        >
                            <FaSignOutAlt /> Logout
                        </button>
                    )}
                </div>
            </aside>

            <header className="sticky top-0 z-40 mb-5 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/20 lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <Link to="/" className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sky-300 dark:bg-white dark:text-slate-950">
                            <FaCalendarCheck />
                        </span>
                        <span className="text-lg font-black">Gatherly</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDarkMode((value) => !value)}
                            className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-slate-100"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? <FaSun /> : <FaMoon />}
                        </button>
                        {user ? (
                            <button onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white dark:bg-sky-500">
                                Logout
                            </button>
                        ) : (
                            <Link to="/login" className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white dark:bg-sky-500">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};

export default Navbar;
