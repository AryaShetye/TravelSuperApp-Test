/**
 * User Model — PostgreSQL (Sequelize)
 * Stores traveler accounts with hashed passwords
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'First name is required' },
      len: { args: [2, 50], msg: 'First name must be 2–50 characters' },
    },
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Last name is required' },
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: { msg: 'Email already registered' },
    validate: {
      isEmail: { msg: 'Must be a valid email address' },
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    // Never returned in queries — see defaultScope below
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: { args: /^\+?[1-9]\d{6,14}$/, msg: 'Invalid phone number format' },
    },
  },
  role: {
    type: DataTypes.ENUM('traveler', 'host', 'driver', 'agent', 'admin'),
    defaultValue: 'traveler',
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  preferredLanguage: {
    type: DataTypes.STRING(10),
    defaultValue: 'en',
  },
  preferredCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  // Exclude password from default queries
  defaultScope: {
    attributes: { exclude: ['password'] },
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] },
    },
  },
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['role'] },
  ],
});

module.exports = User;
