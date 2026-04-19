/**
 * Payment Routes
 */

const router = require('express').Router();
const { createPaymentOrder, verifyPayment, handleWebhook, getPaymentDetails } = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/webhook', handleWebhook);
router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);
router.get('/:bookingId', authenticate, getPaymentDetails);

module.exports = router;
