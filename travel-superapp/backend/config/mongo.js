/**
 * MongoDB connection using Mongoose
 * Handles: properties, reviews (flexible schema documents)
 */

const mongoose = require('mongoose');

async function connectMongo() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_superapp';

    await mongoose.connect(uri, {
      // Mongoose 7+ doesn't need these options, but kept for clarity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

module.exports = { mongoose, connectMongo };
