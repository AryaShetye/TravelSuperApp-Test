/**
 * Booking Model — PostgreSQL (Sequelize)
 * Tracks all homestay reservations
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const Booking = sequelize.define('Booking', {
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
  // MongoDB property ID (cross-DB reference stored as string)
  propertyId: {
    type: DataTypes.STRING(24),
    allowNull: false,
    comment: 'MongoDB ObjectId of the property',
  },
  propertyName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Denormalized for quick display without cross-DB join',
  },
  propertyLocation: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  checkIn: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: { msg: 'Check-in must be a valid date' },
    },
  },
  checkOut: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: { msg: 'Check-out must be a valid date' },
      isAfterCheckIn(value) {
        if (new Date(value) <= new Date(this.checkIn)) {
          throw new Error('Check-out must be after check-in');
        }
      },
    },
  },
  guests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: { args: [1], msg: 'At least 1 guest required' },
      max: { args: [20], msg: 'Maximum 20 guests allowed' },
    },
  },
  nights: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Calculated: checkOut - checkIn in days',
  },
  pricePerNight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'pricePerNight * nights',
  },
  taxes: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'subtotal + taxes',
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR',
  },
  status: {
    type: DataTypes.ENUM(
      'pending',       // created, awaiting payment
      'confirmed',     // payment successful
      'cancelled',     // cancelled by user or host
      'completed',     // stay completed
      'refunded'       // refund processed
    ),
    defaultValue: 'pending',
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'bookings',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['property_id'] },
    { fields: ['status'] },
    { fields: ['check_in', 'check_out'] },
  ],
});

module.exports = Booking;
