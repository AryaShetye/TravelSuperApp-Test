/**
 * Property Model — MongoDB (Mongoose)
 * Flexible schema for homestay listings with rich metadata
 */

const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '✓' },
}, { _id: false });

// ─── Blocked date range subdocument ──────────────────────────────────────────
// _id: true (default) gives each entry a unique ObjectId for targeted deletion
const blockedDateSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  reason:    { type: String, default: '' },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String }, // Cloudinary public_id for deletion
  caption: { type: String, default: '' },
  isPrimary: { type: Boolean, default: false },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: { type: String, required: true, index: true },
  state: { type: String, required: true },
  country: { type: String, required: true, default: 'India' },
  zipCode: { type: String },
  // GeoJSON Point for geospatial queries
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  googlePlaceId: { type: String, comment: 'OSM ID (was Google Place ID — kept for schema compat)' },
  formattedAddress: { type: String },
}, { _id: false });

const houseRulesSchema = new mongoose.Schema({
  checkInTime: { type: String, default: '14:00' },
  checkOutTime: { type: String, default: '11:00' },
  smokingAllowed: { type: Boolean, default: false },
  petsAllowed: { type: Boolean, default: false },
  partiesAllowed: { type: Boolean, default: false },
  quietHours: { type: String, default: '22:00 - 08:00' },
  additionalRules: [{ type: String }],
}, { _id: false });

const propertySchema = new mongoose.Schema({
  // Host reference (PostgreSQL user ID)
  hostId: {
    type: String,
    required: true,
    index: true,
    comment: 'UUID from PostgreSQL users table',
  },
  hostName: {
    type: String,
    required: true,
    comment: 'Denormalized for display without cross-DB join',
  },
  hostAvatar: { type: String },

  // Basic info
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [50, 'Description must be at least 50 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  propertyType: {
    type: String,
    enum: ['entire_home', 'private_room', 'shared_room', 'villa', 'cottage', 'farmhouse'],
    required: true,
  },

  // Capacity & rooms
  maxGuests: { type: Number, required: true, min: 1, max: 50 },
  bedrooms: { type: Number, required: true, min: 0 },
  beds: { type: Number, required: true, min: 1 },
  bathrooms: { type: Number, required: true, min: 0.5 },

  // Pricing
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: [100, 'Minimum price is ₹100 per night'],
  },
  currency: { type: String, default: 'INR' },
  cleaningFee: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  weeklyDiscount: { type: Number, default: 0, min: 0, max: 50 }, // percentage
  monthlyDiscount: { type: Number, default: 0, min: 0, max: 50 },

  // Location
  location: { type: locationSchema, required: true },

  // Media
  images: {
    type: [imageSchema],
    validate: {
      validator: (arr) => arr.length >= 1,
      message: 'At least one image is required',
    },
  },

  // Features
  amenities: [amenitySchema],
  houseRules: { type: houseRulesSchema, default: () => ({}) },

  // Availability
  isAvailable: { type: Boolean, default: true, index: true },
  instantBook: { type: Boolean, default: false },
  minimumStay: { type: Number, default: 1, min: 1 },
  maximumStay: { type: Number, default: 365 },

  // ─── Room inventory (for availability engine) ─────────────────────────────
  totalRooms: {
    type: Number,
    default: 1,
    min: 1,
    comment: 'Total bookable units in this property',
  },
  availableRooms: {
    type: Number,
    default: 1,
    min: 0,
    comment: 'Rooms currently available (decremented on confirm, incremented on cancel)',
  },

  // ─── Revenue tracking ─────────────────────────────────────────────────────
  revenue: {
    total:   { type: Number, default: 0 },  // lifetime confirmed revenue
    monthly: { type: Number, default: 0 },  // current calendar month
    lastResetMonth: { type: String, default: '' }, // 'YYYY-MM' — for monthly reset
  },

  // Ratings (aggregated from reviews)
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    cleanliness: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    location: { type: Number, default: 0 },
    checkIn: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
  },

  // SEO / search
  tags: [{ type: String, lowercase: true }],
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },

  // Availability blocks set by the property manager
  blockedDates: { type: [blockedDateSchema], default: [] },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
propertySchema.index({ 'location.coordinates': '2dsphere' }); // geospatial
propertySchema.index({ 'location.city': 1, pricePerNight: 1 });
propertySchema.index({ isActive: 1, isAvailable: 1 });
propertySchema.index({ title: 'text', description: 'text', tags: 'text' }); // full-text search

// ─── Virtual: primary image URL ───────────────────────────────────────────────
propertySchema.virtual('primaryImage').get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : (this.images[0]?.url || null);
});

// ─── Method: calculate price for date range ───────────────────────────────────
propertySchema.methods.calculatePrice = function (nights) {
  let price = this.pricePerNight * nights;
  if (nights >= 28 && this.monthlyDiscount > 0) {
    price *= (1 - this.monthlyDiscount / 100);
  } else if (nights >= 7 && this.weeklyDiscount > 0) {
    price *= (1 - this.weeklyDiscount / 100);
  }
  const taxes = price * 0.12; // 12% GST
  return {
    subtotal: Math.round(price),
    taxes: Math.round(taxes),
    cleaningFee: this.cleaningFee,
    total: Math.round(price + taxes + this.cleaningFee),
  };
};

// ─── Method: confirm booking — decrement rooms, add revenue ──────────────────
propertySchema.methods.onBookingConfirmed = async function (amount) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const $inc = {
    'revenue.total': amount,
    availableRooms: -1,
  };

  const $set = {};

  // Reset monthly revenue if we've rolled into a new month
  if (this.revenue.lastResetMonth !== currentMonth) {
    $set['revenue.monthly'] = amount;
    $set['revenue.lastResetMonth'] = currentMonth;
  } else {
    $inc['revenue.monthly'] = amount;
  }

  // Mark unavailable if no rooms left after decrement
  if (this.availableRooms <= 1) {
    $set.isAvailable = false;
  }

  // Only include $set if it has keys — MongoDB rejects an empty $set
  const update = Object.keys($set).length > 0 ? { $inc, $set } : { $inc };

  return Property.findByIdAndUpdate(this._id, update, { new: true });
};

// ─── Method: cancel booking — increment rooms, subtract revenue ───────────────
propertySchema.methods.onBookingCancelled = async function (amount) {
  return Property.findByIdAndUpdate(
    this._id,
    {
      $inc: {
        'revenue.total': -Math.abs(amount),
        'revenue.monthly': -Math.abs(amount),
        availableRooms: 1,
      },
      $set: { isAvailable: true },
    },
    { new: true }
  );
};

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
