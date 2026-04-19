/**
 * Socket.io Service
 * Real-time chat, booking updates, and notifications
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Track connected users: userId -> socketId
const connectedUsers = new Map();

/**
 * Initialize Socket.io with the HTTP server
 * @param {http.Server} server
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Authentication middleware for socket connections ─────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Register user
    connectedUsers.set(socket.userId, socket.id);

    // Join personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // ─── Chat events ─────────────────────────────────────────────────────
    socket.on('join:booking', (bookingId) => {
      socket.join(`booking:${bookingId}`);
      console.log(`User ${socket.userId} joined booking room: ${bookingId}`);
    });

    socket.on('leave:booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on('chat:message', (data) => {
      const { bookingId, message } = data;

      if (!bookingId || !message) return;

      const payload = {
        bookingId,
        message: message.slice(0, 500), // sanitize length
        senderId: socket.userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to everyone in the booking room
      io.to(`booking:${bookingId}`).emit('chat:message', payload);
    });

    // ─── Typing indicator ─────────────────────────────────────────────────
    socket.on('chat:typing', ({ bookingId, isTyping }) => {
      socket.to(`booking:${bookingId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping,
      });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}

/**
 * Send a booking status update to a specific user
 * @param {string} userId
 * @param {object} bookingData
 */
function notifyBookingUpdate(userId, bookingData) {
  if (!io) return;
  io.to(`user:${userId}`).emit('booking:update', bookingData);
}

/**
 * Broadcast to all users in a booking room
 * @param {string} bookingId
 * @param {string} event
 * @param {object} data
 */
function emitToBooking(bookingId, event, data) {
  if (!io) return;
  io.to(`booking:${bookingId}`).emit(event, data);
}

/**
 * Check if a user is currently connected
 * @param {string} userId
 * @returns {boolean}
 */
function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, notifyBookingUpdate, emitToBooking, isUserOnline, getIO };
