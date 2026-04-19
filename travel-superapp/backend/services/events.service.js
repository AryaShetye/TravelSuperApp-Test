/**
 * Events Service — Booking lifecycle dispatcher
 * Works with Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');

function safeEmit(room, event, data) {
  try {
    const { getIO } = require('./socket.service');
    getIO().to(room).emit(event, data);
  } catch { /* socket not ready — non-critical */ }
}

function notifyUser(userId, data) {
  try {
    const { notifyBookingUpdate } = require('./socket.service');
    notifyBookingUpdate(userId, data);
  } catch { /* non-critical */ }
}

async function onBookingConfirmed(booking, traveler) {
  const amount = parseFloat(booking.totalAmount);

  // Update property revenue (fire-and-forget)
  try {
    const db = getDB();
    const propDoc = await db.collection('properties').doc(booking.propertyId).get();
    if (propDoc.exists) {
      const prop = propDoc.data();
      await db.collection('properties').doc(booking.propertyId).update({
        'revenue.total': (prop.revenue?.total || 0) + amount,
        updatedAt: new Date().toISOString(),
      });
      safeEmit(`user:${prop.hostId}`, 'booking:confirmed', {
        bookingId: booking.id,
        propertyName: booking.propertyName,
        totalAmount: amount,
      });
    }
  } catch (err) {
    console.error('[events] onBookingConfirmed:', err.message);
  }

  notifyUser(booking.userId, { bookingId: booking.id, status: 'confirmed', message: '🎉 Booking confirmed!' });

  if (traveler?.phone) {
    const { sendBookingConfirmation } = require('./notification.service');
    sendBookingConfirmation(traveler, booking).catch(() => {});
  }
}

async function onBookingCancelled(booking, traveler) {
  notifyUser(booking.userId, { bookingId: booking.id, status: 'cancelled', message: '❌ Booking cancelled.' });

  if (traveler?.phone) {
    const { sendBookingCancellation } = require('./notification.service');
    sendBookingCancellation(traveler, booking).catch(() => {});
  }
}

async function onBookingCompleted(booking) {
  notifyUser(booking.userId, {
    bookingId: booking.id,
    status: 'completed',
    message: `🏁 Stay at ${booking.propertyName} complete. Leave a review!`,
    canReview: true,
  });
}

async function onBookingCreated(booking, traveler) {
  try {
    const db = getDB();
    const propDoc = await db.collection('properties').doc(booking.propertyId).get();
    if (propDoc.exists) {
      const guestName = traveler ? `${traveler.firstName} ${traveler.lastName}` : 'A guest';
      safeEmit(`user:${propDoc.data().hostId}`, 'booking:new', {
        bookingId: booking.id,
        propertyName: booking.propertyName,
        guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: parseFloat(booking.totalAmount),
        status: 'pending',
      });
    }
  } catch { /* non-critical */ }
}

module.exports = { onBookingCreated, onBookingConfirmed, onBookingCancelled, onBookingCompleted };
