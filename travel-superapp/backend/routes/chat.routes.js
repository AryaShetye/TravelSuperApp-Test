/**
 * Chat Routes
 * POST /api/chat — AI travel assistant
 */

const router = require('express').Router();
const { chat } = require('../controllers/chat.controller');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const chatValidation = [
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 500 }),
];

// Public — no auth required (chatbot is available to all visitors)
router.post('/', chatValidation, validate, chat);

module.exports = router;
