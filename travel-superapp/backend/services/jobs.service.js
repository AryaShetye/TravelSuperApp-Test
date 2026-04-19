/**
 * Background Jobs — auto-complete past bookings
 * Works with Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');
const { onBookingCompleted } = require('./events.service');

async function autoCompleteBookings() {
  try {
    const db = getDB();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoff = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    const snap = await db.collection('bookings').where('status', '==', 'confirmed').get();
    const stale = snap.docs.map(d => d.data()).filter(b => b.checkOut < cutoff);

    if (stale.length === 0) return;

    console.log(`[jobs] Auto-completing ${stale.length} booking(s)...`);

    for (const booking of stale) {
      await db.collection('bookings').doc(booking.id).update({
        status: 'completed',
        updatedAt: new Date().toISOString(),
      });
      await onBookingCompleted(booking);
    }

    console.log(`[jobs] ✅ Auto-completed ${stale.length} booking(s)`);
  } catch (err) {
    console.error('[jobs] autoCompleteBookings error:', err.message);
  }
}

function startJobs() {
  autoCompleteBookings();
  setInterval(autoCompleteBookings, 60 * 60 * 1000); // every hour
  console.log('✅ Background jobs started');
}

module.exports = { startJobs, autoCompleteBookings };
