/**
 * Driver Controller — Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');

async function getDriverDashboard(req, res, next) {
  try {
    const db = getDB();
    const driverId = req.user.id;

    const snap = await db.collection('transport').get();
    const allTrips = snap.docs.map(d => d.data());

    const myTrips = allTrips.filter(t => t.driverId === driverId);
    const pendingRequests = allTrips.filter(t => t.status === 'pending' && !t.driverId).length;

    const totalTrips = myTrips.length;
    const completedTrips = myTrips.filter(t => t.status === 'completed').length;
    const activeTrips = myTrips.filter(t => ['accepted', 'in_progress'].includes(t.status)).length;
    const totalEarnings = myTrips.filter(t => t.status === 'completed').reduce((s, t) => s + (t.fare || 0), 0);

    const recentTrips = myTrips
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Enrich with traveler info
    const enriched = await Promise.all(recentTrips.map(async t => {
      const userDoc = await db.collection('users').doc(t.userId).get();
      const traveler = userDoc.exists ? userDoc.data() : null;
      return { ...t, traveler: traveler ? { firstName: traveler.firstName, lastName: traveler.lastName, phone: traveler.phone } : null };
    }));

    res.json({ data: { totalTrips, completedTrips, activeTrips, pendingRequests, totalEarnings, recentTrips: enriched } });
  } catch (error) {
    next(error);
  }
}

async function getMyTrips(req, res, next) {
  try {
    const { status } = req.query;
    const db = getDB();

    let query = db.collection('transport').where('driverId', '==', req.user.id);
    if (status) query = query.where('status', '==', status);

    const snap = await query.get();
    const trips = snap.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const enriched = await Promise.all(trips.map(async t => {
      const userDoc = await db.collection('users').doc(t.userId).get();
      const traveler = userDoc.exists ? userDoc.data() : null;
      return { ...t, traveler: traveler ? { firstName: traveler.firstName, lastName: traveler.lastName, phone: traveler.phone, avatar: traveler.avatar } : null };
    }));

    res.json({ trips: enriched });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDriverDashboard, getMyTrips };
