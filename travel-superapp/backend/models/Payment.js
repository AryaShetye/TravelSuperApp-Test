/**
 * Payment Model — PostgreSQL (Sequelize)
 * Tracks Razorpay payment transactions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'bookings', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  // Razorpay identifiers
  razorpayOrderId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'order_xxxxxxxxxx from Razorpay',
  },
  razorpayPaymentId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'pay_xxxxxxxxxx — set after successful payment',
  },
  razorpaySignature: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'HMAC signature for verification',
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Amount in INR (or selected currency)',
  },
  amountInPaise: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Amount * 100 — Razorpay uses smallest currency unit',
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR',
  },
  status: {
    type: DataTypes.ENUM(
      'created',    // order created, awaiting payment
      'paid',       // payment successful and verified
      'failed',     // payment failed
      'refunded'    // refund processed
    ),
    defaultValue: 'created',
  },
  method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'card, upi, netbanking, wallet, etc.',
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refundId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Raw Razorpay webhook payload for audit',
  },
}, {
  tableName: 'payments',
  indexes: [
    { fields: ['booking_id'] },
    { fields: ['user_id'] },
    { unique: true, fields: ['razorpay_order_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Payment;
