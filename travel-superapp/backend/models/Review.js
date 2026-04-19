/**
 * Review Model — MongoDB (Mongoose)
 * Guest reviews for properties after completed stays
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  },
  bookingId: {
    type: String, // PostgreSQL UUID
    required: true,
    unique: true, // one review per booking
  },
  userId: {
    type: String, // PostgreSQL UUID
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
    comment: 'Denormalized for display',
  },
  userAvatar: { type: String },

  // Ratings (1–5 scale)
  ratings: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, required: true, min: 1, max: 5 },
    accuracy: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, required: true, min: 1, max: 5 },
    location: { type: Number, required: true, min: 1, max: 5 },
    checkIn: { type: Number, required: true, min: 1, max: 5 },
    value: { type: Number, required: true, min: 1, max: 5 },
  },

  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [20, 'Review must be at least 20 characters'],
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    trim: true,
  },

  // Host response
  hostResponse: {
    comment: { type: String, maxlength: 500 },
    respondedAt: { type: Date },
  },

  isVisible: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// ─── Post-save: update property aggregate ratings ─────────────────────────────
reviewSchema.post('save', async function () {
  const Property = mongoose.model('Property');
  const reviews = await mongoose.model('Review').find({
    propertyId: this.propertyId,
    isVisible: true,
  });

  if (reviews.length === 0) return;

  const avg = (field) =>
    reviews.reduce((sum, r) => sum + r.ratings[field], 0) / reviews.length;

  await Property.findByIdAndUpdate(this.propertyId, {
    'rating.average': parseFloat(avg('overall').toFixed(1)),
    'rating.count': reviews.length,
    'rating.cleanliness': parseFloat(avg('cleanliness').toFixed(1)),
    'rating.accuracy': parseFloat(avg('accuracy').toFixed(1)),
    'rating.communication': parseFloat(avg('communication').toFixed(1)),
    'rating.location': parseFloat(avg('location').toFixed(1)),
    'rating.checkIn': parseFloat(avg('checkIn').toFixed(1)),
    'rating.value': parseFloat(avg('value').toFixed(1)),
  });
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
