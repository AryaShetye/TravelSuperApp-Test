/**
 * Socket.io client service
 * Manages real-time connection for chat and booking updates
 */

import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function joinBookingRoom(bookingId) {
  socket?.emit('join:booking', bookingId);
}

export function leaveBookingRoom(bookingId) {
  socket?.emit('leave:booking', bookingId);
}

export function sendChatMessage(bookingId, message) {
  socket?.emit('chat:message', { bookingId, message });
}

export function sendTypingIndicator(bookingId, isTyping) {
  socket?.emit('chat:typing', { bookingId, isTyping });
}
