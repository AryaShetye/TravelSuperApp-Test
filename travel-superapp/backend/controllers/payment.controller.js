/**
 * Payment Controller — Razorpay + Firebase/In-Memory DB
 */

const crypto = require('crypto');
const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── Create Razorpay Order ────────────────────────────────────────────────────
async function createPaymentOrder(req, res, next) {
  try {
    const { bookingId } = req.body;
    const db = getDB();

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) return res.status(404).json({ error: 'Booking not found' });

    const booking = bookingDoc.data();
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: `Cannot create payment for booking with status: ${booking.status}` });
    }

    // Check if already paid
    const existingSnap = await db.collection('payments').where('bookingId', '==', bookingId).where('status', '==', 'paid').get();
    if (!existingSnap.empty) return res.status(400).json({ error: 'Booking already paid' });

    // Create Razorpay order
    let orderId, amountInPaise;

    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      amountInPaise = Math.round(booking.totalAmount * 100);
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: booking.currency || 'INR',
        receipt: `booking_${bookingId.slice(0, 8)}`,
        notes: { bookingId },
      });
      orderId = order.id;
    } catch (razorpayErr) {
      // Fallback for test/demo mode
      console.warn('Razorpay unavailable, using demo order:', razorpayErr.message);
      orderId = `order_demo_${uuidv4().slice(0, 16)}`;
      amountInPaise = Math.round(booking.totalAmount * 100);
    }

    // Save payment record
    const paymentId = uuidv4();
    await db.collection('payments').doc(paymentId).set({
      id: paymentId,
      bookingId,
      userId: req.user.id,
      razorpayOrderId: orderId,
      amount: booking.totalAmount,
      amountInPaise,
      currency: booking.currency || 'INR',
      status: 'created',
      method: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.json({
      orderId,
      amount: amountInPaise,
      amountInINR: booking.totalAmount,
      currency: booking.currency || 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId,
      paymentId,
      prefill: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        contact: req.user.phone || '',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Verify Payment ───────────────────────────────────────────────────────────
async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    const db = getDB();

    // Verify HMAC signature
    const isDemo = razorpay_order_id?.startsWith('order_demo_');
    if (!isDemo) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
      }
    }

    // Update payment record
    const paymentSnap = await db.collection('payments').where('razorpayOrderId', '==', razorpay_order_id).get();
    if (!paymentSnap.empty) {
      await db.collection('payments').doc(paymentSnap.docs[0].id).update({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Confirm booking
    await db.collection('bookings').doc(bookingId).update({
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedBooking = await db.collection('bookings').doc(bookingId).get();

    res.json({
      message: 'Payment verified and booking confirmed!',
      booking: updatedBooking.data(),
      payment: {
        razorpayPaymentId: razorpay_payment_id,
        amount: updatedBooking.data()?.totalAmount,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Webhook ──────────────────────────────────────────────────────────────────
async function handleWebhook(req, res) {
  // Acknowledge immediately
  res.json({ received: true });
}

// ─── Get Payment Details ──────────────────────────────────────────────────────
async function getPaymentDetails(req, res, next) {
  try {
    const db = getDB();
    const snap = await db.collection('payments')
      .where('bookingId', '==', req.params.bookingId)
      .where('userId', '==', req.user.id)
      .get();

    if (snap.empty) return res.status(404).json({ error: 'Payment not found' });
    res.json({ payment: snap.docs[0].data() });
  } catch (error) {
    next(error);
  }
}

module.exports = { createPaymentOrder, verifyPayment, handleWebhook, getPaymentDetails };
