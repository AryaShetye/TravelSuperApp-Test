/**
 * Manager Controller — Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const updateBookingStatusValidation = [
  body('status').isIn(['confirmed', 'cancelled']).withMessage('status must be "confirmed" or "cancelled"'),
];

const blockDatesValidation = [
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date'),
];

// ─── GET /api/manager/dashboard ───────────────────────────────────────────────
async function getDashboard(req, res, next) {
  try {
    const db = getDB();
    const managerId = req.user.id;

    const propsSnap = await db.collection('properties').where('hostId', '==', managerId).where('isActive', '==', true).get();
    const properties = propsSnap.docs.map(d => d.data());
    const propertyIds = properties.map(p => p.id);

    if (propertyIds.length === 0) {
      return res.json({ data: { totalProperties: 0, activeBookings: 0, completedBookings: 0, totalEarnings: 0, monthlyEarnings: 0, recentBookings: [] } });
    }

    // Get all bookings for these properties
    const bookingsSnap = await db.collection('bookings').get();
    const allBookings = bookingsSnap.docs.map(d => d.data()).filter(b => propertyIds.includes(b.propertyId));

    const activeBookings = allBookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length;
    const completedBookings = allBookings.filter(b => b.status === 'completed').length;
    const totalEarnings = allBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.totalAmount || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyEarnings = allBookings
      .filter(b => b.status === 'completed' && b.confirmedAt >= monthStart)
      .reduce((s, b) => s + (b.totalAmount || 0), 0);

    const recentBookings = allBookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(b => ({
        id: b.id,
        propertyName: b.propertyName,
        guestName: 'Guest',
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        totalAmount: b.totalAmount,
        status: b.status,
        createdAt: b.createdAt,
      }));

    res.json({
      data: { totalProperties: properties.length, activeBookings, completedBookings, totalEarnings, monthlyEarnings, recentBookings },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/manager/properties ─────────────────────────────────────────────
async function getManagerProperties(req, res, next) {
  try {
    const db = getDB();
    const snap = await db.collection('properties').where('hostId', '==', req.user.id).get();
    const properties = snap.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ data: { properties, total: properties.length } });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/manager/bookings ────────────────────────────────────────────────
async function getManagerBookings(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const db = getDB();

    const propsSnap = await db.collection('properties').where('hostId', '==', req.user.id).where('isActive', '==', true).get();
    const propertyIds = propsSnap.docs.map(d => d.id);

    if (propertyIds.length === 0) {
      return res.json({ data: { bookings: [], pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 } } });
    }

    const bookingsSnap = await db.collection('bookings').get();
    let bookings = bookingsSnap.docs.map(d => d.data()).filter(b => propertyIds.includes(b.propertyId));

    if (status) bookings = bookings.filter(b => b.status === status);
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = bookings.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = bookings.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Enrich with user info
    const enriched = await Promise.all(paginated.map(async b => {
      const userDoc = await db.collection('users').doc(b.userId).get();
      const user = userDoc.exists ? userDoc.data() : null;
      return {
        ...b,
        guestName: user ? `${user.firstName} ${user.lastName}` : 'Guest',
        guestEmail: user?.email || '',
      };
    }));

    res.json({
      data: {
        bookings: enriched,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/manager/bookings/:id/status ───────────────────────────────────
async function updateBookingStatus(req, res, next) {
  try {
    const { status, cancellationReason } = req.body;
    const db = getDB();

    const doc = await db.collection('bookings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });

    const booking = doc.data();

    // Verify ownership
    const propDoc = await db.collection('properties').doc(booking.propertyId).get();
    if (!propDoc.exists || propDoc.data().hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot update a booking with status: ${booking.status}` });
    }

    const updates = { status, updatedAt: new Date().toISOString() };
    if (status === 'confirmed') updates.confirmedAt = new Date().toISOString();
    if (status === 'cancelled') {
      updates.cancelledAt = new Date().toISOString();
      updates.cancellationReason = cancellationReason || 'Cancelled by property manager';
    }

    await db.collection('bookings').doc(req.params.id).update(updates);
    const updated = await db.collection('bookings').doc(req.params.id).get();
    res.json({ data: { booking: updated.data() } });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/manager/properties/:id/block-dates ────────────────────────────
async function blockDates(req, res, next) {
  try {
    const { startDate, endDate, reason } = req.body;
    const db = getDB();

    const doc = await db.collection('properties').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Property not found' });

    const property = doc.data();
    if (property.hostId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) return res.status(400).json({ error: 'startDate must be before endDate' });

    const blockedDates = property.blockedDates || [];
    blockedDates.push({ id: uuidv4(), startDate, endDate, reason: reason || '' });

    await db.collection('properties').doc(req.params.id).update({ blockedDates, updatedAt: new Date().toISOString() });
    const updated = await db.collection('properties').doc(req.params.id).get();
    res.json({ data: { property: updated.data() } });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/manager/properties/:id/block-dates/:blockId ─────────────────
async function unblockDates(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('properties').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Property not found' });

    const property = doc.data();
    if (property.hostId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const blockedDates = (property.blockedDates || []).filter(b => b.id !== req.params.blockId);
    await db.collection('properties').doc(req.params.id).update({ blockedDates, updatedAt: new Date().toISOString() });
    res.json({ data: { message: 'Date block removed successfully' } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard, getManagerProperties, getManagerBookings,
  updateBookingStatus, blockDates, unblockDates,
  updateBookingStatusValidation, blockDatesValidation,
};
