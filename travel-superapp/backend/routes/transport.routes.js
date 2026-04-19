/**
 * Transport Routes — /api/transport
 */

const router = require('express').Router();
const {
  createTransport, getMyTransports, getTransport,
  getDriverRequests, acceptTrip, updateTripStatus,
  cancelTransport, getEstimate, createTransportValidation,
} = require('../controllers/transport.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { body } = require('express-validator');

// Public estimate (no auth needed)
router.get('/estimate', getEstimate);

// All other routes require auth
router.use(authenticate);

// Traveler routes
router.post('/', createTransportValidation, validate, createTransport);
router.get('/', getMyTransports);
router.get('/:id', getTransport);
router.delete('/:id', cancelTransport);

// Driver routes
router.get('/driver/requests', authorize('driver', 'admin'), getDriverRequests);
router.patch('/:id/accept', authorize('driver', 'admin'), acceptTrip);
router.patch(
  '/:id/status',
  authorize('driver', 'admin'),
  [body('status').isIn(['in_progress', 'completed', 'cancelled']).withMessage('Invalid status')],
  validate,
  updateTripStatus
);

module.exports = router;
