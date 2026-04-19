/**
 * PackageBooking Model — PostgreSQL (Sequelize)
 * Tracks user bookings of agent-created tour packages
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const PackageBooking = sequelize.define('PackageBooking', {
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
  packageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'tour_packages', key: 'id' },
  },
  persons: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: { args: [1], msg: 'At least 1 person required' } },
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  travelDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
    defaultValue: 'pending',
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'package_bookings',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['package_id'] },
  ],
});

module.exports = PackageBooking;
