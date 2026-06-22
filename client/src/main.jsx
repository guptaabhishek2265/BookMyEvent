import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

if (!googleClientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID is not configured. Google sign-in will be unavailable.')
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </GoogleOAuthProvider>
    </React.StrictMode>,
)
