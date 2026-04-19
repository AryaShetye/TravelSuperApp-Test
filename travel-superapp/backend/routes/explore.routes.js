/**
 * Explore Routes — /api/explore/*
 * Public endpoints for destination discovery
 */

const router = require('express').Router();
const {
  getTrendingDestinations,
  getNearbyAttractions,
  searchDestinations,
  getDistanceAndRoute,
} = require('../controllers/explore.controller');

router.get('/trending', getTrendingDestinations);
router.get('/nearby', getNearbyAttractions);
router.get('/search', searchDestinations);
router.get('/distance', getDistanceAndRoute);

module.exports = router;
