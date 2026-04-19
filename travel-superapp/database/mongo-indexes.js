/**
 * MongoDB Index Setup Script
 * Run once: node travel-superapp/database/mongo-indexes.js
 */

require('dotenv').config({ path: '../backend/.env' });
const mongoose = require('mongoose');

async function createIndexes() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_superapp');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Properties collection indexes
  await db.collection('properties').createIndexes([
    { key: { 'location.coordinates': '2dsphere' }, name: 'location_geo' },
    { key: { 'location.city': 1, pricePerNight: 1 }, name: 'city_price' },
    { key: { isActive: 1, isAvailable: 1 }, name: 'active_available' },
    { key: { title: 'text', description: 'text', tags: 'text' }, name: 'text_search' },
    { key: { hostId: 1 }, name: 'host_id' },
    { key: { isFeatured: 1 }, name: 'featured' },
    { key: { 'rating.average': -1 }, name: 'rating_desc' },
  ]);
  console.log('✅ Properties indexes created');

  // Reviews collection indexes
  await db.collection('reviews').createIndexes([
    { key: { propertyId: 1, createdAt: -1 }, name: 'property_reviews' },
    { key: { bookingId: 1 }, name: 'booking_review', unique: true },
    { key: { userId: 1 }, name: 'user_reviews' },
  ]);
  console.log('✅ Reviews indexes created');

  await mongoose.disconnect();
  console.log('Done!');
}

createIndexes().catch(console.error);
