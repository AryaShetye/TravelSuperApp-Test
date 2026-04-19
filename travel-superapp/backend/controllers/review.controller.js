/**
 * Review Controller — Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── POST /api/reviews ────────────────────────────────────────────────────────
async function createReview(req, res, next) {
  try {
    const { propertyId, bookingId, ratings, comment } = req.body;
    const db = getDB();

    // Verify booking belongs to user and is completed
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) return res.status(404).json({ error: 'Booking not found' });

    const booking = bookingDoc.data();
    if (booking.userId !== req.user.id || booking.status !== 'completed') {
      return res.status(403).json({ error: 'You can only review properties after completing your stay' });
    }

    // Check for existing review
    const existingSnap = await db.collection('reviews').where('bookingId', '==', bookingId).get();
    if (!existingSnap.empty) {
      return res.status(409).json({ error: 'You have already reviewed this booking' });
    }

    const id = uuidv4();
    const review = {
      id,
      propertyId,
      bookingId,
      userId: req.user.id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userAvatar: req.user.avatar || null,
      ratings: ratings || { overall: 5 },
      comment,
      isVisible: true,
      hostResponse: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('reviews').doc(id).set(review);

    // Update property rating
    const reviewsSnap = await db.collection('reviews').where('propertyId', '==', propertyId).where('isVisible', '==', true).get();
    const allReviews = reviewsSnap.docs.map(d => d.data());
    const avgRating = allReviews.reduce((s, r) => s + (r.ratings?.overall || 5), 0) / allReviews.length;

    await db.collection('properties').doc(propertyId).update({
      'rating.average': parseFloat(avgRating.toFixed(1)),
      'rating.count': allReviews.length,
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/reviews/property/:propertyId ────────────────────────────────────
async function getPropertyReviews(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const db = getDB();

    const snap = await db.collection('reviews')
      .where('propertyId', '==', req.params.propertyId)
      .where('isVisible', '==', true)
      .get();

    let reviews = snap.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = reviews.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    reviews = reviews.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      reviews,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/reviews/:id/respond ───────────────────────────────────────────
async function respondToReview(req, res, next) {
  try {
    const { comment } = req.body;
    const db = getDB();

    const doc = await db.collection('reviews').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Review not found' });

    const review = doc.data();
    const propDoc = await db.collection('properties').doc(review.propertyId).get();
    if (!propDoc.exists || propDoc.data().hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only the property host can respond to reviews' });
    }

    await db.collection('reviews').doc(req.params.id).update({
      hostResponse: { comment, respondedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.collection('reviews').doc(req.params.id).get();
    res.json({ message: 'Response added', review: updated.data() });
  } catch (error) {
    next(error);
  }
}

module.exports = { createReview, getPropertyReviews, respondToReview };
