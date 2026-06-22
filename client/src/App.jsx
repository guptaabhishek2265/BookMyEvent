import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import PaymentPage from './pages/PaymentPage';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50">
                <Navbar />
                <main className="min-h-screen px-4 py-5 sm:px-6 lg:pl-80 lg:pr-8">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/events/:id" element={<EventDetail />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<UserDashboard />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-failed" element={<PaymentFailed />} />
                        <Route path="/payment/:bookingId" element={<PaymentPage />} />
                        <Route path="*" element={<h1 className="mt-20 text-center text-3xl font-bold">404 - Page Not Found</h1>} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
