/**
 * Travel Super App - Main Server Entry Point
 * Express backend with Firebase Firestore (or in-memory DB for local dev)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Database
// const { initDB } = require('./config/db');
let pgPool;

// Socket.io
const { initSocket } = require('./services/socket.service');

// Route imports
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payment.routes');
const userRoutes = require('./routes/user.routes');
const reviewRoutes = require('./routes/review.routes');
const managerRoutes = require('./routes/manager.routes');
const transportRoutes = require('./routes/transport.routes');
const packageRoutes = require('./routes/package.routes');
const driverRoutes = require('./routes/driver.routes');
const adminRoutes = require('./routes/admin.routes');
const exploreRoutes = require('./routes/explore.routes');
const serpapiRoutes = require('./routes/serpapi.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
app.set('trust proxy',1);
const server = http.createServer(app);
app.get('/', (_req, res) => {
  res.send("Travel Super App Backend Running 🚀");
});


// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// app.use(cors({
//   origin: [
//     process.env.FRONTEND_URL || 'http://localhost:3000',
//     'http://localhost:3000',
//     'http://localhost:3001',
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── Initialize Socket.io ─────────────────────────────────────────────────────
initSocket(server);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Travel Super App API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    postgres: pgPool ? "connected" : "disconnected",
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/explore', exploreRoutes);

// ─── SerpAPI real-time travel data ────────────────────────────────────────────
app.use('/api', serpapiRoutes);

// ─── AI Chatbot ───────────────────────────────────────────────────────────────
app.use('/api/chat', chatRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: `Route not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const { seedData } = require('./utils/seed');
const { startPriceAlertJob } = require('./services/priceAlertJob');

async function startServer() {
  try {
    // ✅ Connect Mongo + Postgres
    // await connectDB();

    // ✅ Seed data
    await seedData();

    // ✅ Start cron jobs
    startPriceAlertJob();

    // ✅ Start server
    server.listen(PORT, () => {
      console.log(`\n🚀 Travel Super App API running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// async function startServer() {
//   try {
//     // Initialize database (Firebase or in-memory)
//     await initDB();

//     // Seed initial data
//     const { seedData } = require('./utils/seed');
//     await seedData();

//     server.listen(PORT, () => {
//       console.log(`\n🚀 Travel Super App API running on port ${PORT}`);
//       console.log(`📍 Environment: ${process.env.NODE_ENV}`);
//       console.log(`🌐 Health check: http://localhost:${PORT}/api/health\n`);
//     });
//   } catch (error) {
//     console.error('❌ Failed to start server:', error);
//     process.exit(1);
//   }
// }

// startServer();

module.exports = { app, server };
