/**
 * Booking Controller — Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── POST /api/bookings ───────────────────────────────────────────────────────
async function createBooking(req, res, next) {
  try {
    const { propertyId, checkIn, checkOut, guests, specialRequests } = req.body;
    const db = getDB();

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (checkInDate < today) return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    if (checkOutDate <= checkInDate) return res.status(400).json({ error: 'Check-out must be after check-in' });

    // Fetch property
    const propDoc = await db.collection('properties').doc(propertyId).get();
    if (!propDoc.exists) return res.status(404).json({ error: 'Property not found' });

    const property = propDoc.data();
    if (!property.isActive || !property.isAvailable) {
      return res.status(409).json({ error: 'Property is not available for booking' });
    }

    if (parseInt(guests) > property.maxGuests) {
      return res.status(400).json({ error: `Property accommodates maximum ${property.maxGuests} guests` });
    }

    // Check for conflicting bookings
    const conflictsSnap = await db.collection('bookings')
      .where('propertyId', '==', propertyId)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    const hasConflict = conflictsSnap.docs.some(d => {
      const b = d.data();
      return new Date(b.checkIn) < checkOutDate && new Date(b.checkOut) > checkInDate;
    });

    if (hasConflict) {
      return res.status(409).json({ error: 'Property is already booked for the selected dates' });
    }

    // Calculate pricing
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights < (property.minimumStay || 1)) {
      return res.status(400).json({ error: `Minimum stay is ${property.minimumStay || 1} night(s)` });
    }

    let price = property.pricePerNight * nights;
    if (nights >= 28 && property.monthlyDiscount > 0) price *= (1 - property.monthlyDiscount / 100);
    else if (nights >= 7 && property.weeklyDiscount > 0) price *= (1 - property.weeklyDiscount / 100);

    const subtotal = Math.round(price);
    const taxes = Math.round(subtotal * 0.12);
    const cleaningFee = property.cleaningFee || 0;
    const totalAmount = subtotal + taxes + cleaningFee;

    const id = uuidv4();
    const booking = {
      id,
      userId: req.user.id,
      propertyId,
      propertyName: property.title,
      propertyLocation: property.location?.formattedAddress || property.location?.city || '',
      propertyImage: property.images?.[0]?.url || null,
      checkIn,
      checkOut,
      guests: parseInt(guests),
      nights,
      pricePerNight: property.pricePerNight,
      subtotal,
      taxes,
      cleaningFee,
      totalAmount,
      currency: 'INR',
      status: 'pending',
      specialRequests: specialRequests || null,
      cancellationReason: null,
      confirmedAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('bookings').doc(id).set(booking);

    res.status(201).json({
      message: 'Booking created. Please complete payment to confirm.',
      booking,
      pricing: { pricePerNight: property.pricePerNight, nights, subtotal, taxes, cleaningFee, total: totalAmount, currency: 'INR' },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/bookings ────────────────────────────────────────────────────────
async function getMyBookings(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const db = getDB();

    let query = db.collection('bookings').where('userId', '==', req.user.id);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.get();
    let bookings = snapshot.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = bookings.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    bookings = bookings.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      bookings,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
async function getBooking(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('bookings').doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });

    const booking = doc.data();
    if (booking.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'host' && req.user.role !== 'property_manager') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Fetch property
    const propDoc = await db.collection('properties').doc(booking.propertyId).get();
    const property = propDoc.exists ? propDoc.data() : null;

    // Fetch host
    let host = null;
    if (property?.hostId) {
      const hostDoc = await db.collection('users').doc(property.hostId).get();
      if (hostDoc.exists) {
        const h = hostDoc.data();
        host = { firstName: h.firstName, lastName: h.lastName, email: h.email, phone: h.phone, avatar: h.avatar };
      }
    }

    // Fetch transport if linked
    let transport = null;
    const transportSnap = await db.collection('transport').where('bookingId', '==', req.params.id).get();
    if (!transportSnap.empty) transport = transportSnap.docs[0].data();

    res.json({
      booking,
      property,
      host,
      transport,
      itinerary: {
        bookingId: booking.id.slice(0, 8).toUpperCase(),
        propertyName: booking.propertyName,
        location: booking.propertyLocation,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guests: booking.guests,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        status: booking.status,
        houseRules: property?.houseRules || {},
        hostContact: host ? `${host.firstName} ${host.lastName}` : 'N/A',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/bookings/:id/cancel ─────────────────────────────────────────────
async function cancelBooking(req, res, next) {
  try {
    const { reason } = req.body;
    const db = getDB();

    const doc = await db.collection('bookings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });

    const booking = doc.data();
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking with status: ${booking.status}` });
    }

    const checkInDate = new Date(booking.checkIn);
    const hoursUntilCheckIn = (checkInDate - new Date()) / (1000 * 60 * 60);
    if (hoursUntilCheckIn < 24 && booking.status === 'confirmed') {
      return res.status(400).json({ error: 'Cannot cancel within 24 hours of check-in' });
    }

    await db.collection('bookings').doc(req.params.id).update({
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by user',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.collection('bookings').doc(req.params.id).get();
    res.json({ message: 'Booking cancelled successfully', booking: updated.data() });
  } catch (error) {
    next(error);
  }
}

module.exports = { createBooking, getMyBookings, getBooking, cancelBooking };
