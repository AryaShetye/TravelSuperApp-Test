/**
 * Driver Routes — /api/driver
 * All routes require role = 'driver' or 'admin'
 */

const router = require('express').Router();
const { getDriverDashboard, getMyTrips } = require('../controllers/driver.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('driver', 'admin'));

router.get('/dashboard', getDriverDashboard);
router.get('/trips', getMyTrips);

module.exports = router;
