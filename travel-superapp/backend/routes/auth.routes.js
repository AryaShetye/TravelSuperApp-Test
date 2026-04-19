/**
 * Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 * PUT  /api/auth/profile
 * PUT  /api/auth/change-password
 */

const router = require('express').Router();
const {
  register, login, getMe, updateProfile, changePassword,
  registerValidation, loginValidation,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
