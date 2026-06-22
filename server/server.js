const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const { verifyEmailConfig } = require('./utils/email');

const app = express();

// Middleware
const localOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const deployedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...localOrigins, ...deployedOrigins];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Eventora API is running' });
});

app.get('/api/health/email', async (req, res) => {
  try {
    const result = await verifyEmailConfig();
    res.json({
      ok: true,
      message: 'Email configuration is valid',
      host: result.host,
      port: result.port,
      secure: result.secure,
      fallback: Boolean(result.fallback),
      user: result.user
    });
  } catch (error) {
    console.error('Email health check failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    res.status(500).json({
      ok: false,
      message: 'Email configuration failed',
      error: error.message,
      code: error.code
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eventora')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  const server = app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other server or set a different PORT in server/.env.`);
      process.exit(1);
    }

    throw error;
  });
}

module.exports = app;
