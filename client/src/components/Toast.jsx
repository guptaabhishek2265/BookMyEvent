import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const toastConfig = {
    success: {
        icon: FaCheckCircle,
        style: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100'
    },
    error: {
        icon: FaExclamationTriangle,
        style: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-100'
    },
    info: {
        icon: FaInfoCircle,
        style: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-100'
    }
};

const Toast = ({ toast, onClose }) => {
    if (!toast) return null;

    const config = toastConfig[toast.type] || toastConfig.info;
    const Icon = config.icon;

    return (
        <div className="fixed right-4 top-4 z-50 max-w-sm animate-[toastIn_220ms_ease-out] sm:right-6">
            <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${config.style}`}>
                <Icon className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm font-black">{toast.title}</p>
                    {toast.message && <p className="mt-0.5 text-xs font-medium opacity-80">{toast.message}</p>}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-2 rounded-full p-1 opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                    aria-label="Dismiss notification"
                >
                    <FaTimes className="text-xs" />
                </button>
            </div>
        </div>
    );
};

export default Toast;
