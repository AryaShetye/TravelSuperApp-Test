/**
 * Review Routes
 */

const router = require('express').Router();
const { createReview, getPropertyReviews, respondToReview } = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/property/:propertyId', getPropertyReviews);
router.post('/', authenticate, createReview);
router.put('/:id/respond', authenticate, authorize('host', 'property_manager', 'admin'), respondToReview);

module.exports = router;
