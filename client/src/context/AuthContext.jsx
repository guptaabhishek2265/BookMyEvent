import React, { createContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import api from '../utils/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                setUser(JSON.parse(userInfo));
            } catch {
                localStorage.removeItem('userInfo');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const persistAuth = (data) => {
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
        localStorage.setItem('token', data.token);
        return data;
    };

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            return persistAuth(data);
        } catch (error) {
            if (error.response?.data?.needsVerification) throw error.response.data;
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            return data; // Returns { message, email }
        } catch (error) {
            throw error.response?.data?.message || 'Registration failed';
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            return persistAuth(data);
        } catch (error) {
            throw error.response?.data?.message || 'OTP verification failed';
        }
    };

    const googleLogin = async (credential) => {
        try {
            const { data } = await api.post('/auth/google', { credential });
            return persistAuth(data);
        } catch (error) {
            throw error.response?.data?.message || 'Google authentication failed';
        }
    };

    const logout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, googleLogin, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
