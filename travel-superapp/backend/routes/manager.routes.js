/**
 * Manager Routes — /api/manager/*
 * Requires role = 'host', 'property_manager', or 'admin'
 */

const router = require('express').Router();
const {
  getDashboard, getManagerProperties, getManagerBookings,
  updateBookingStatus, blockDates, unblockDates,
  updateBookingStatusValidation, blockDatesValidation,
} = require('../controllers/manager.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

router.use(authenticate);
router.use(authorize('host', 'property_manager', 'agent', 'admin'));

router.get('/dashboard', getDashboard);
router.get('/properties', getManagerProperties);
router.post('/properties/:id/block-dates', blockDatesValidation, validate, blockDates);
router.delete('/properties/:id/block-dates/:blockId', unblockDates);
router.get('/bookings', getManagerBookings);
router.patch('/bookings/:id/status', updateBookingStatusValidation, validate, updateBookingStatus);

module.exports = router;
