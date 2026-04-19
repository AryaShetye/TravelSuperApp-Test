/**
 * TransportBooking Model — PostgreSQL (Sequelize)
 * Tracks ride/transport requests between source and destination
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const TransportBooking = sequelize.define('TransportBooking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  // Optional link to a stay booking
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'bookings', key: 'id' },
  },
  vehicleType: {
    type: DataTypes.ENUM('car', 'suv', 'van', 'bus', 'bike', 'auto'),
    defaultValue: 'car',
  },
  pickupAddress: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  pickupLat: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  pickupLng: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  dropoffAddress: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  dropoffLat: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  dropoffLng: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  distanceKm: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },
  estimatedMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR',
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  pickupTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'transport_bookings',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['driver_id'] },
    { fields: ['status'] },
  ],
});

module.exports = TransportBooking;
