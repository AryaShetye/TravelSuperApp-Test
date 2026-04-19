/**
 * TourPackage Model — PostgreSQL (Sequelize)
 * Agent-created travel packages combining stay + transport + activities
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const TourPackage = sequelize.define('TourPackage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Package title is required' },
      len: { args: [5, 200], msg: 'Title must be 5–200 characters' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  destination: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: { args: [1], msg: 'Duration must be at least 1 day' } },
  },
  pricePerPerson: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0], msg: 'Price cannot be negative' } },
  },
  maxPersons: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  includesStay: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  includesTransport: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  includesActivities: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // JSON array of activity strings
  activities: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // JSON array of { day, title, description }
  itineraryDays: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // JSON array of { url, caption }
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'tour_packages',
  indexes: [
    { fields: ['agent_id'] },
    { fields: ['destination'] },
    { fields: ['is_active'] },
  ],
});

module.exports = TourPackage;
