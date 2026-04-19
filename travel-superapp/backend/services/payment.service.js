/**
 * Payment Service — Razorpay Integration
 * Handles order creation, payment verification, and refunds
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} bookingId - Internal booking UUID for receipt
 * @param {string} currency - Default 'INR'
 * @returns {Promise<RazorpayOrder>}
 */
async function createOrder(amount, bookingId, currency = 'INR') {
  const amountInPaise = Math.round(amount * 100); // Razorpay uses smallest unit

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency,
    receipt: `booking_${bookingId.slice(0, 20)}`, // max 40 chars
    notes: {
      bookingId,
      source: 'travel-superapp',
    },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    amountInINR: amount,
    currency: order.currency,
    receipt: order.receipt,
  };
}

/**
 * Verify Razorpay payment signature
 * This is CRITICAL — prevents payment fraud
 * @param {string} orderId - razorpay_order_id from frontend
 * @param {string} paymentId - razorpay_payment_id from frontend
 * @param {string} signature - razorpay_signature from frontend
 * @returns {boolean}
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId
 */
async function fetchPayment(paymentId) {
  return razorpay.payments.fetch(paymentId);
}

/**
 * Initiate a refund
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Refund amount in INR (null = full refund)
 * @param {string} reason - Reason for refund
 */
async function initiateRefund(paymentId, amount = null, reason = 'Booking cancelled') {
  const refundData = {
    notes: { reason },
  };

  if (amount) {
    refundData.amount = Math.round(amount * 100); // convert to paise
  }

  return razorpay.payments.refund(paymentId, refundData);
}

module.exports = { createOrder, verifyPaymentSignature, fetchPayment, initiateRefund };
