/**
 * Admin Routes — /api/admin/*
 * Requires role = 'admin'
 */

const router = require('express').Router();
const { getDashboard, getUsers, toggleUserStatus, getProperties, approveProperty } = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/properties', getProperties);
router.patch('/properties/:id/approve', approveProperty);

module.exports = router;
