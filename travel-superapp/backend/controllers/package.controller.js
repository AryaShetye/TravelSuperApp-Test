/**
 * Package Controller — Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');

const packageValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ min: 5, max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  body('durationDays').isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
  body('pricePerPerson').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

// ─── GET /api/packages ────────────────────────────────────────────────────────
async function getPackages(req, res, next) {
  try {
    const { destination, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const db = getDB();

    const snapshot = await db.collection('packages').where('isActive', '==', true).get();
    let packages = snapshot.docs.map(d => d.data());

    if (destination) {
      packages = packages.filter(p => p.destination.toLowerCase().includes(destination.toLowerCase()));
    }
    if (minPrice) packages = packages.filter(p => p.pricePerPerson >= parseFloat(minPrice));
    if (maxPrice) packages = packages.filter(p => p.pricePerPerson <= parseFloat(maxPrice));

    packages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = packages.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = packages.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Enrich with agent info
    const enriched = await Promise.all(paginated.map(async pkg => {
      const agentDoc = await db.collection('users').doc(pkg.agentId).get();
      const agent = agentDoc.exists ? agentDoc.data() : null;
      return { ...pkg, agent: agent ? { id: agent.id, firstName: agent.firstName, lastName: agent.lastName, avatar: agent.avatar } : null };
    }));

    res.json({
      packages: enriched,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/packages/:id ────────────────────────────────────────────────────
async function getPackage(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('packages').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Package not found' });

    const pkg = doc.data();
    if (!pkg.isActive) return res.status(404).json({ error: 'Package not found' });

    const agentDoc = await db.collection('users').doc(pkg.agentId).get();
    const agent = agentDoc.exists ? agentDoc.data() : null;

    res.json({
      package: {
        ...pkg,
        agent: agent ? { id: agent.id, firstName: agent.firstName, lastName: agent.lastName, avatar: agent.avatar, email: agent.email } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/packages ───────────────────────────────────────────────────────
async function createPackage(req, res, next) {
  try {
    const {
      title, description, destination, durationDays, pricePerPerson,
      maxPersons, includesStay, includesTransport, includesActivities,
      activities, itineraryDays, images,
    } = req.body;

    const db = getDB();
    const id = uuidv4();

    const pkg = {
      id,
      agentId: req.user.id,
      title,
      description,
      destination,
      durationDays: parseInt(durationDays),
      pricePerPerson: parseFloat(pricePerPerson),
      maxPersons: parseInt(maxPersons) || 10,
      includesStay: includesStay !== false,
      includesTransport: includesTransport !== false,
      includesActivities: !!includesActivities,
      activities: activities || [],
      itineraryDays: itineraryDays || [],
      images: images || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('packages').doc(id).set(pkg);
    res.status(201).json({ message: 'Package created successfully', package: pkg });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/packages/:id ────────────────────────────────────────────────────
async function updatePackage(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('packages').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Package not found' });

    const pkg = doc.data();
    if (pkg.agentId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.id; delete updates.agentId;

    await db.collection('packages').doc(req.params.id).update(updates);
    const updated = await db.collection('packages').doc(req.params.id).get();
    res.json({ message: 'Package updated', package: updated.data() });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/packages/:id ─────────────────────────────────────────────────
async function deletePackage(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('packages').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Package not found' });

    const pkg = doc.data();
    if (pkg.agentId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('packages').doc(req.params.id).update({ isActive: false });
    res.json({ message: 'Package removed' });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/packages/:id/book ──────────────────────────────────────────────
async function bookPackage(req, res, next) {
  try {
    const { persons = 1, travelDate, specialRequests } = req.body;
    const db = getDB();

    const pkgDoc = await db.collection('packages').doc(req.params.id).get();
    if (!pkgDoc.exists) return res.status(404).json({ error: 'Package not found' });

    const pkg = pkgDoc.data();
    if (!pkg.isActive) return res.status(404).json({ error: 'Package not found' });

    if (parseInt(persons) > pkg.maxPersons) {
      return res.status(400).json({ error: `Maximum ${pkg.maxPersons} persons allowed` });
    }

    const totalAmount = parseFloat(pkg.pricePerPerson) * parseInt(persons);
    const id = uuidv4();

    const booking = {
      id,
      userId: req.user.id,
      packageId: req.params.id,
      persons: parseInt(persons),
      totalAmount,
      travelDate,
      status: 'pending',
      specialRequests: specialRequests || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('packageBookings').doc(id).set(booking);

    // ─── Cross-role event: if package includes transport, create a transport request ──
    if (pkg.includesTransport && travelDate) {
      const { v4: uuid2 } = require('uuid');
      const transportId = uuid2();
      await db.collection('transport').doc(transportId).set({
        id: transportId,
        userId: req.user.id,
        driverId: null,
        bookingId: null,
        packageBookingId: id,
        vehicleType: 'car',
        pickupAddress: `${pkg.destination} — Package pickup`,
        dropoffAddress: `${pkg.destination} — Package destination`,
        pickupLat: null, pickupLng: null, dropoffLat: null, dropoffLng: null,
        distanceKm: null, estimatedMinutes: null, fare: null,
        currency: 'INR',
        status: 'pending',
        pickupTime: travelDate ? new Date(travelDate).toISOString() : null,
        notes: `Package: ${pkg.title} — ${parseInt(persons)} person(s)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      message: 'Package booked successfully',
      booking,
      package: { title: pkg.title, destination: pkg.destination, durationDays: pkg.durationDays },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/packages/my/bookings ───────────────────────────────────────────
async function getMyPackageBookings(req, res, next) {
  try {
    const db = getDB();
    const snapshot = await db.collection('packageBookings').where('userId', '==', req.user.id).get();
    const bookings = snapshot.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const enriched = await Promise.all(bookings.map(async b => {
      const pkgDoc = await db.collection('packages').doc(b.packageId).get();
      return { ...b, package: pkgDoc.exists ? pkgDoc.data() : null };
    }));

    res.json({ bookings: enriched });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/packages/agent/my-packages ─────────────────────────────────────
async function getAgentPackages(req, res, next) {
  try {
    const db = getDB();
    const snapshot = await db.collection('packages').where('agentId', '==', req.user.id).get();
    const packages = snapshot.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const enriched = await Promise.all(packages.map(async pkg => {
      const bookingsSnap = await db.collection('packageBookings').where('packageId', '==', pkg.id).get();
      return { ...pkg, bookings: bookingsSnap.docs.map(d => d.data()) };
    }));

    res.json({ packages: enriched });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/packages/bookings/:id/status ─────────────────────────────────
async function updatePackageBookingStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ['confirmed', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const db = getDB();
    const doc = await db.collection('packageBookings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });

    const booking = doc.data();
    const pkgDoc = await db.collection('packages').doc(booking.packageId).get();
    if (!pkgDoc.exists || pkgDoc.data().agentId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('packageBookings').doc(req.params.id).update({ status, updatedAt: new Date().toISOString() });
    const updated = await db.collection('packageBookings').doc(req.params.id).get();
    res.json({ message: 'Booking status updated', booking: updated.data() });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPackages, getPackage, createPackage, updatePackage, deletePackage,
  bookPackage, getMyPackageBookings, getAgentPackages, updatePackageBookingStatus,
  packageValidation,
};
