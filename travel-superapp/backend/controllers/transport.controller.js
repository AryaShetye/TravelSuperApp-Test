/**
 * Transport Controller — Firebase/In-Memory DB
 * Fare = base + (rate_per_km × distance) — NO random values
 */

const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const axios = require('axios');

// ─── Fare rates (₹ per km) ────────────────────────────────────────────────────
const FARE_RATES = {
  bike:  { base: 20, perKm: 5,  label: 'Bike' },
  auto:  { base: 30, perKm: 8,  label: 'Auto' },
  car:   { base: 50, perKm: 12, label: 'Car' },
  suv:   { base: 80, perKm: 18, label: 'SUV' },
  van:   { base: 100, perKm: 22, label: 'Van' },
  bus:   { base: 150, perKm: 35, label: 'Bus' },
};

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Calculate fare from distance ─────────────────────────────────────────────
function calculateFare(vehicleType, distanceKm) {
  const rate = FARE_RATES[vehicleType] || FARE_RATES.car;
  return Math.round(rate.base + rate.perKm * distanceKm);
}

// ─── Geocode address via OSM ──────────────────────────────────────────────────
async function geocodeAddress(address) {
  try {
    const encoded = encodeURIComponent(address);
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0' }, timeout: 4000 }
    );
    if (res.data?.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
    }
  } catch { /* fallback */ }
  return null;
}

// ─── Validation ───────────────────────────────────────────────────────────────
const createTransportValidation = [
  body('pickupAddress').notEmpty().withMessage('Pickup address is required'),
  body('dropoffAddress').notEmpty().withMessage('Dropoff address is required'),
  body('vehicleType').optional().isIn(Object.keys(FARE_RATES)).withMessage('Invalid vehicle type'),
  body('pickupTime').optional().isISO8601().withMessage('Invalid pickup time'),
];

// ─── GET /api/transport/estimate ─────────────────────────────────────────────
async function getEstimate(req, res, next) {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, pickupAddress, dropoffAddress } = req.query;

    let lat1 = parseFloat(pickupLat);
    let lng1 = parseFloat(pickupLng);
    let lat2 = parseFloat(dropoffLat);
    let lng2 = parseFloat(dropoffLng);

    // If no coordinates, geocode the addresses
    if ((!lat1 || !lng1) && pickupAddress) {
      const coords = await geocodeAddress(pickupAddress);
      if (coords) { lat1 = coords.lat; lng1 = coords.lng; }
    }
    if ((!lat2 || !lng2) && dropoffAddress) {
      const coords = await geocodeAddress(dropoffAddress);
      if (coords) { lat2 = coords.lat; lng2 = coords.lng; }
    }

    if (!lat1 || !lng1 || !lat2 || !lng2) {
      return res.status(400).json({ error: 'Could not determine coordinates. Please provide valid addresses.' });
    }

    // Try OSRM (free routing engine) for real road distance
    // Only use OSRM when coordinates are already provided (not geocoded from text)
    let distanceKm, estimatedMinutes;
    const coordsProvided = pickupLat && pickupLng && dropoffLat && dropoffLng;

    if (coordsProvided) {
      try {
        const osrmRes = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`,
          { headers: { 'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0' }, timeout: 6000 }
        );
        if (osrmRes.data?.routes?.length > 0) {
          const roadDist = parseFloat((osrmRes.data.routes[0].distance / 1000).toFixed(2));
          // Sanity check: road distance shouldn't be more than 3x straight-line
          const straightLine = haversineKm(lat1, lng1, lat2, lng2);
          if (roadDist < straightLine * 3) {
            distanceKm = roadDist;
            estimatedMinutes = Math.round(osrmRes.data.routes[0].duration / 60);
          }
        }
      } catch { /* fallback to Haversine */ }
    }

    // Fallback: Haversine straight-line distance (reliable for all cases)
    if (!distanceKm) {
      distanceKm = parseFloat(haversineKm(lat1, lng1, lat2, lng2).toFixed(2));
      estimatedMinutes = Math.round((distanceKm / 35) * 60); // avg 35 km/h city speed
    }

    const estimates = Object.entries(FARE_RATES).map(([type, rate]) => ({
      vehicleType: type,
      label: rate.label,
      fare: calculateFare(type, distanceKm),
      currency: 'INR',
      estimatedMinutes,
    }));

    res.json({ distanceKm, estimatedMinutes, estimates });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/transport ──────────────────────────────────────────────────────
async function createTransport(req, res, next) {
  try {
    const {
      pickupAddress, pickupLat, pickupLng,
      dropoffAddress, dropoffLat, dropoffLng,
      vehicleType = 'car', pickupTime, notes, bookingId,
    } = req.body;

    const db = getDB();

    let lat1 = pickupLat ? parseFloat(pickupLat) : null;
    let lng1 = pickupLng ? parseFloat(pickupLng) : null;
    let lat2 = dropoffLat ? parseFloat(dropoffLat) : null;
    let lng2 = dropoffLng ? parseFloat(dropoffLng) : null;

    // Geocode if coordinates not provided
    if (!lat1 || !lng1) {
      const coords = await geocodeAddress(pickupAddress);
      if (coords) { lat1 = coords.lat; lng1 = coords.lng; }
    }
    if (!lat2 || !lng2) {
      const coords = await geocodeAddress(dropoffAddress);
      if (coords) { lat2 = coords.lat; lng2 = coords.lng; }
    }

    let distanceKm = null;
    let estimatedMinutes = null;
    let fare = null;

    if (lat1 && lng1 && lat2 && lng2) {
      distanceKm = parseFloat(haversineKm(lat1, lng1, lat2, lng2).toFixed(2));
      estimatedMinutes = Math.round((distanceKm / 40) * 60);
      fare = calculateFare(vehicleType, distanceKm);
    }

    const id = uuidv4();
    const transport = {
      id,
      userId: req.user.id,
      driverId: null,
      bookingId: bookingId || null,
      vehicleType,
      pickupAddress,
      pickupLat: lat1,
      pickupLng: lng1,
      dropoffAddress,
      dropoffLat: lat2,
      dropoffLng: lng2,
      distanceKm,
      estimatedMinutes,
      fare,
      currency: 'INR',
      status: 'pending',
      pickupTime: pickupTime || null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('transport').doc(id).set(transport);

    res.status(201).json({
      message: 'Transport booking created',
      transport,
      estimate: distanceKm ? { distanceKm, estimatedMinutes, fare, currency: 'INR' } : null,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/transport ───────────────────────────────────────────────────────
async function getMyTransports(req, res, next) {
  try {
    const { status } = req.query;
    const db = getDB();

    let query = db.collection('transport').where('userId', '==', req.user.id);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.get();
    const transports = snapshot.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Enrich with driver info
    const enriched = await Promise.all(transports.map(async t => {
      if (t.driverId) {
        const driverDoc = await db.collection('users').doc(t.driverId).get();
        if (driverDoc.exists) {
          const d = driverDoc.data();
          return { ...t, driver: { id: d.id, firstName: d.firstName, lastName: d.lastName, phone: d.phone, avatar: d.avatar } };
        }
      }
      return { ...t, driver: null };
    }));

    res.json({ transports: enriched });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/transport/:id ───────────────────────────────────────────────────
async function getTransport(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('transport').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Transport booking not found' });

    const transport = doc.data();
    if (transport.userId !== req.user.id && transport.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ transport });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/transport/driver/requests ──────────────────────────────────────
async function getDriverRequests(req, res, next) {
  try {
    const { status = 'pending' } = req.query;
    const db = getDB();

    let query;
    if (status === 'mine') {
      query = db.collection('transport').where('driverId', '==', req.user.id);
    } else {
      query = db.collection('transport').where('status', '==', status);
    }

    const snapshot = await query.get();
    let transports = snapshot.docs.map(d => d.data());

    // Filter unassigned for pending
    if (status === 'pending') {
      transports = transports.filter(t => !t.driverId);
    }

    // Enrich with traveler info
    const enriched = await Promise.all(transports.map(async t => {
      const userDoc = await db.collection('users').doc(t.userId).get();
      const traveler = userDoc.exists ? userDoc.data() : null;
      return { ...t, traveler: traveler ? { id: traveler.id, firstName: traveler.firstName, lastName: traveler.lastName, phone: traveler.phone } : null };
    }));

    res.json({ transports: enriched });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/transport/:id/accept ─────────────────────────────────────────
async function acceptTrip(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('transport').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Transport booking not found' });

    const transport = doc.data();
    if (transport.status !== 'pending') {
      return res.status(400).json({ error: 'This trip is no longer available' });
    }

    await db.collection('transport').doc(req.params.id).update({
      driverId: req.user.id,
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.collection('transport').doc(req.params.id).get();
    res.json({ message: 'Trip accepted', transport: updated.data() });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/transport/:id/status ─────────────────────────────────────────
async function updateTripStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ['in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const db = getDB();
    const doc = await db.collection('transport').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Trip not found' });

    const transport = doc.data();
    if (transport.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Not assigned to you' });
    }

    await db.collection('transport').doc(req.params.id).update({ status, updatedAt: new Date().toISOString() });
    const updated = await db.collection('transport').doc(req.params.id).get();
    res.json({ message: 'Trip status updated', transport: updated.data() });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/transport/:id ────────────────────────────────────────────────
async function cancelTransport(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('transport').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Transport booking not found' });

    const transport = doc.data();
    if (transport.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    if (['completed', 'in_progress'].includes(transport.status)) {
      return res.status(400).json({ error: 'Cannot cancel an active or completed trip' });
    }

    await db.collection('transport').doc(req.params.id).update({ status: 'cancelled', updatedAt: new Date().toISOString() });
    res.json({ message: 'Transport booking cancelled' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTransport, getMyTransports, getTransport,
  getDriverRequests, acceptTrip, updateTripStatus,
  cancelTransport, getEstimate, createTransportValidation,
};
