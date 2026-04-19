/**
 * SerpAPI Routes — Real-time travel data
 *
 * GET /api/hotels      — Hotel listings (SerpAPI → local DB fallback)
 * GET /api/flights     — Flight search (SerpAPI → fallback)
 * GET /api/attractions — Attractions/reviews (SerpAPI TripAdvisor → OSM fallback)
 * GET /api/explore     — Trending destinations (SerpAPI Travel Explore → curated fallback)
 * GET /api/distance    — Distance/travel time (SerpAPI Maps → OSRM → Haversine fallback)
 */

const router = require('express').Router();
const {
  getHotels,
  getFlights,
  getAttractions,
  getExplore,
  getDistance,
} = require('../controllers/serpapi.controller');

// All public — no auth required for search
router.get('/hotels', getHotels);
router.get('/flights', getFlights);
router.get('/attractions', getAttractions);
router.get('/explore', getExplore);
router.get('/distance', getDistance);

module.exports = router;
