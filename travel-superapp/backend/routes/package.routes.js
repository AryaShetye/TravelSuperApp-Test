/**
 * Package Routes — /api/packages
 */

const router = require('express').Router();
const {
  getPackages, getPackage, createPackage, updatePackage, deletePackage,
  bookPackage, getMyPackageBookings, getAgentPackages,
  updatePackageBookingStatus, packageValidation,
} = require('../controllers/package.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

// Public routes
router.get('/', getPackages);
router.get('/:id', getPackage);

// Auth required
router.use(authenticate);

// Traveler routes
router.post('/:id/book', bookPackage);
router.get('/my/bookings', getMyPackageBookings);

// Agent routes
router.post('/', authorize('agent', 'admin'), packageValidation, validate, createPackage);
router.put('/:id', authorize('agent', 'admin'), updatePackage);
router.delete('/:id', authorize('agent', 'admin'), deletePackage);
router.get('/agent/my-packages', authorize('agent', 'admin'), getAgentPackages);
router.patch('/bookings/:id/status', authorize('agent', 'admin'), updatePackageBookingStatus);

module.exports = router;
