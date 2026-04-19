/**
 * Booking Routes
 * POST /api/bookings           - Create booking
 * GET  /api/bookings           - Get my bookings
 * GET  /api/bookings/:id       - Get booking details (itinerary)
 * PUT  /api/bookings/:id/cancel - Cancel booking
 */

const router = require('express').Router();
const { createBooking, getMyBookings, getBooking, cancelBooking } = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const bookingValidation = [
  body('propertyId').notEmpty().withMessage('Property ID is required'),
  body('checkIn').isDate().withMessage('Valid check-in date required'),
  body('checkOut').isDate().withMessage('Valid check-out date required'),
  body('guests').isInt({ min: 1, max: 20 }).withMessage('Guests must be between 1 and 20'),
];

router.use(authenticate); // all booking routes require auth

// ─── RBAC: Only travelers can create bookings ─────────────────────────────────
const { authorize } = require('../middlewares/auth.middleware');

router.post('/', bookingValidation, validate, authorize('traveler', 'admin'), createBooking);
router.get('/', getMyBookings);
router.get('/:id', getBooking);
router.put('/:id/cancel', cancelBooking);

module.exports = router;
