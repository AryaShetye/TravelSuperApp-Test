/**
 * Property Routes
 */

const router = require('express').Router();
const {
  getProperties, getProperty, createProperty,
  updateProperty, deleteProperty, getLocationSuggestions,
} = require('../controllers/property.controller');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');
const { upload, handleUploadError } = require('../middlewares/upload.middleware');

// Public routes
router.get('/', optionalAuth, getProperties);
router.get('/suggestions', getLocationSuggestions);
router.get('/:id', optionalAuth, getProperty);

// Protected — multer parses multipart/form-data so req.files is populated
router.post(
  '/',
  authenticate,
  authorize('host', 'property_manager', 'agent', 'admin'),
  upload.array('images', 10),
  handleUploadError,
  createProperty
);

router.put(
  '/:id',
  authenticate,
  authorize('host', 'property_manager', 'agent', 'admin'),
  upload.array('images', 10),
  handleUploadError,
  updateProperty
);

router.delete('/:id', authenticate, authorize('host', 'property_manager', 'agent', 'admin'), deleteProperty);

module.exports = router;
