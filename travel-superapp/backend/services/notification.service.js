/**
 * Notification Service
 * Firebase Cloud Messaging (push) + Twilio (SMS fallback)
 */

const axios = require('axios');
const twilio = require('twilio');

// Twilio client (lazy init to avoid crash if credentials missing)
let twilioClient;
function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

/**
 * Send Firebase Cloud Messaging push notification
 * @param {string} fcmToken - Device FCM token
 * @param {string} title
 * @param {string} body
 * @param {object} data - Extra payload
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!process.env.FIREBASE_SERVER_KEY) {
    console.warn('Firebase server key not configured. Skipping push notification.');
    return null;
  }

  try {
    const response = await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      {
        to: fcmToken,
        notification: { title, body, sound: 'default' },
        data,
        priority: 'high',
      },
      {
        headers: {
          Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('FCM push notification error:', error.message);
    return null;
  }
}

/**
 * Send SMS via Twilio
 * @param {string} to - Phone number with country code (e.g., +919876543210)
 * @param {string} message
 */
async function sendSMS(to, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio credentials not configured. Skipping SMS.');
    return null;
  }

  try {
    const client = getTwilioClient();
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log(`SMS sent to ${to}: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    return null;
  }
}

/**
 * Send booking confirmation notification (push + SMS)
 * @param {object} user - { phone, fcmToken, firstName }
 * @param {object} booking - { id, propertyName, checkIn, checkOut, totalAmount }
 */
async function sendBookingConfirmation(user, booking) {
  const title = '🏠 Booking Confirmed!';
  const body = `Your stay at ${booking.propertyName} is confirmed. Check-in: ${booking.checkIn}`;

  const smsMessage =
    `Travel SuperApp: Booking CONFIRMED!\n` +
    `Property: ${booking.propertyName}\n` +
    `Check-in: ${booking.checkIn} | Check-out: ${booking.checkOut}\n` +
    `Amount: ₹${booking.totalAmount}\n` +
    `Booking ID: ${booking.id.slice(0, 8).toUpperCase()}`;

  // Send both in parallel
  const promises = [];

  if (user.fcmToken) {
    promises.push(sendPushNotification(user.fcmToken, title, body, { bookingId: booking.id }));
  }

  if (user.phone) {
    promises.push(sendSMS(user.phone, smsMessage));
  }

  await Promise.allSettled(promises);
}

/**
 * Send booking cancellation notification
 */
async function sendBookingCancellation(user, booking) {
  const smsMessage =
    `Travel SuperApp: Booking CANCELLED\n` +
    `Property: ${booking.propertyName}\n` +
    `Booking ID: ${booking.id.slice(0, 8).toUpperCase()}\n` +
    `Refund will be processed in 5-7 business days.`;

  if (user.phone) {
    await sendSMS(user.phone, smsMessage);
  }

  if (user.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      '❌ Booking Cancelled',
      `Your booking at ${booking.propertyName} has been cancelled.`,
      { bookingId: booking.id }
    );
  }
}

module.exports = {
  sendPushNotification,
  sendSMS,
  sendBookingConfirmation,
  sendBookingCancellation,
};
