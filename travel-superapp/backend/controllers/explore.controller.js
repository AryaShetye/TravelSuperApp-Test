/**
 * Explore Controller
 * Trending destinations, nearby attractions, and travel suggestions
 * Uses free APIs: OpenStreetMap Nominatim + Overpass + Wikidata
 */

const axios = require('axios');
const { getDB } = require('../config/db');

const OSM_HEADERS = {
  'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0 (contact@travelsuperapp.com)',
};

// ─── Curated trending destinations (India-focused) ────────────────────────────
// These are real destinations with real coordinates — no fake data
const TRENDING_DESTINATIONS = [
  { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.1240, emoji: '🏖️', tag: 'Beach Paradise' },
  { name: 'Manali', state: 'Himachal Pradesh', lat: 32.2396, lng: 77.1887, emoji: '⛰️', tag: 'Mountain Escape' },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, emoji: '🏰', tag: 'Pink City' },
  { name: 'Kerala', state: 'Kerala', lat: 10.8505, lng: 76.2711, emoji: '🌴', tag: 'God\'s Own Country' },
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, emoji: '🏛️', tag: 'City of Lakes' },
  { name: 'Coorg', state: 'Karnataka', lat: 12.3375, lng: 75.8069, emoji: '☕', tag: 'Coffee Country' },
  { name: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676, emoji: '🧘', tag: 'Yoga Capital' },
  { name: 'Andaman', state: 'Andaman & Nicobar', lat: 11.7401, lng: 92.6586, emoji: '🐠', tag: 'Island Getaway' },
];

// ─── GET /api/explore/trending ────────────────────────────────────────────────
async function getTrendingDestinations(req, res, next) {
  try {
    const db = getDB();

    // Enrich each destination with property count from our DB
    const enriched = await Promise.all(
      TRENDING_DESTINATIONS.map(async (dest) => {
        try {
          const snap = await db.collection('properties')
            .where('location.city', '==', dest.name)
            .where('isActive', '==', true)
            .get();
          return { ...dest, propertyCount: snap.docs.length };
        } catch {
          return { ...dest, propertyCount: 0 };
        }
      })
    );

    res.json({ destinations: enriched });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/explore/nearby ─────────────────────────────────────────────────
// Returns tourist attractions near given coordinates using Overpass API (free)
async function getNearbyAttractions(req, res, next) {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const query = `[out:json][timeout:15];(node["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park"](around:${radius},${lat},${lng});node["amenity"~"restaurant|cafe|bar"](around:2000,${lat},${lng});node["leisure"~"park|beach"](around:3000,${lat},${lng}););out 12;`;

    const response = await axios.get(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { headers: OSM_HEADERS, timeout: 15000 }
    );

    const places = (response.data?.elements || [])
      .filter(e => e.tags?.name)
      .slice(0, 10)
      .map(e => ({
        id: e.id,
        name: e.tags.name,
        type: e.tags.tourism || e.tags.amenity || e.tags.leisure || 'place',
        lat: e.lat,
        lng: e.lon,
        website: e.tags.website || null,
        openingHours: e.tags.opening_hours || null,
      }));

    res.json({ places });
  } catch (error) {
    // Overpass can be slow — return empty gracefully
    res.json({ places: [] });
  }
}

// ─── GET /api/explore/search ──────────────────────────────────────────────────
// Search destinations using Nominatim (free OSM geocoding)
async function searchDestinations(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ results: [] });

    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&countrycodes=in&addressdetails=1`,
      { headers: OSM_HEADERS, timeout: 5000 }
    );

    const results = (response.data || []).map(r => ({
      name: r.display_name.split(',')[0],
      fullName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type,
      city: r.address?.city || r.address?.town || r.address?.village || r.display_name.split(',')[0],
      state: r.address?.state || '',
    }));

    res.json({ results });
  } catch (error) {
    res.json({ results: [] });
  }
}

// ─── GET /api/explore/distance ────────────────────────────────────────────────
// Calculate distance and travel time between two points using OSRM (free routing)
async function getDistanceAndRoute(req, res, next) {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng are required' });
    }

    // Use OSRM (free, open-source routing engine)
    const response = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`,
      { headers: OSM_HEADERS, timeout: 8000 }
    );

    if (response.data?.routes?.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
      const durationMinutes = Math.round(route.duration / 60);

      return res.json({
        distanceKm,
        durationMinutes,
        durationText: durationMinutes < 60
          ? `${durationMinutes} min`
          : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        distanceText: `${distanceKm} km`,
      });
    }

    // Fallback: Haversine
    const R = 6371;
    const dLat = ((parseFloat(toLat) - parseFloat(fromLat)) * Math.PI) / 180;
    const dLng = ((parseFloat(toLng) - parseFloat(fromLng)) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((parseFloat(fromLat) * Math.PI) / 180) *
      Math.cos((parseFloat(toLat) * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const distanceKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));

    res.json({
      distanceKm,
      durationMinutes: Math.round((distanceKm / 40) * 60),
      durationText: `~${Math.round((distanceKm / 40) * 60)} min`,
      distanceText: `${distanceKm} km`,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTrendingDestinations, getNearbyAttractions, searchDestinations, getDistanceAndRoute };
