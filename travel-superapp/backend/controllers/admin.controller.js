/**
 * Admin Controller — System-level management
 */

const { getDB } = require('../config/db');

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
async function getDashboard(req, res, next) {
  try {
    const db = getDB();

    const [usersSnap, propsSnap, bookingsSnap, packagesSnap, transportSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('properties').get(),
      db.collection('bookings').get(),
      db.collection('packages').get(),
      db.collection('transport').get(),
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const bookings = bookingsSnap.docs.map(d => d.data());
    const transport = transportSnap.docs.map(d => d.data());

    const roleBreakdown = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    const totalRevenue = bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((s, b) => s + (b.totalAmount || 0), 0);

    const recentUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, createdAt: u.createdAt }));

    res.json({
      data: {
        totalUsers: users.length,
        totalProperties: propsSnap.docs.length,
        totalBookings: bookings.length,
        totalPackages: packagesSnap.docs.length,
        totalTransport: transport.length,
        totalRevenue,
        roleBreakdown,
        recentUsers,
        bookingsByStatus: {
          pending: bookings.filter(b => b.status === 'pending').length,
          confirmed: bookings.filter(b => b.status === 'confirmed').length,
          completed: bookings.filter(b => b.status === 'completed').length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
async function getUsers(req, res, next) {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const db = getDB();

    let query = db.collection('users');
    if (role) query = query.where('role', '==', role);

    const snap = await query.get();
    let users = snap.docs.map(d => {
      const { password, ...u } = d.data();
      return u;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = users.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    users = users.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ users, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────
async function toggleUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const db = getDB();

    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    await db.collection('users').doc(req.params.id).update({ isActive, updatedAt: new Date().toISOString() });
    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/properties ────────────────────────────────────────────────
async function getProperties(req, res, next) {
  try {
    const db = getDB();
    const snap = await db.collection('properties').get();
    const properties = snap.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ properties, total: properties.length });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/properties/:id/approve ─────────────────────────────────
async function approveProperty(req, res, next) {
  try {
    const { approved } = req.body;
    const db = getDB();

    const doc = await db.collection('properties').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Property not found' });

    await db.collection('properties').doc(req.params.id).update({
      isApproved: approved,
      isActive: approved,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: `Property ${approved ? 'approved' : 'rejected'}` });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard, getUsers, toggleUserStatus, getProperties, approveProperty };
