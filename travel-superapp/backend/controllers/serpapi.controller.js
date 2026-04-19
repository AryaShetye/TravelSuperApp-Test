/**
 * SerpAPI Controller
 * Real-time travel data endpoints: hotels, flights, attractions, destinations
 *
 * Architecture:
 *  - SerpAPI key present → returns live data
 *  - SerpAPI key missing/quota exceeded → falls back to local DB / OSM data
 *  - Never crashes — always returns a usable response
 */

const serpapi = require('../services/serpapi.service');
const { getDB } = require('../config/db');
const axios = require('axios');

const OSM_HEADERS = {
  'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0',
};

// ─── GET /api/hotels ──────────────────────────────────────────────────────────
// Returns real hotels from SerpAPI, falls back to local DB properties
async function getHotels(req, res, next) {
  try {
    const {
      location = 'Goa',
      checkIn,
      checkOut,
      guests = 2,
      page = 1,
      limit = 12,
    } = req.query;

    // ── Try SerpAPI first ──────────────────────────────────────────────────
    const serpHotels = await serpapi.searchHotels(location, checkIn, checkOut, parseInt(guests));

    if (serpHotels && serpHotels.length > 0) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const paginated = serpHotels.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        source: 'serpapi',
        hotels: paginated,
        pagination: {
          total: serpHotels.length,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(serpHotels.length / limitNum),
        },
        location,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
      });
    }

    // ── Fallback: local DB properties ──────────────────────────────────────
    const db = getDB();
    let query = db.collection('properties').where('isActive', '==', true);
    if (location) query = query.where('location.city', '==', location);

    const snapshot = await query.get();
    let properties = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    // If no city match, return all
    if (properties.length === 0) {
      const allSnap = await db.collection('properties').where('isActive', '==', true).get();
      properties = allSnap.docs.map(d => ({ ...d.data(), id: d.id }));
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = properties.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      source: 'local',
      hotels: paginated,
      pagination: {
        total: properties.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(properties.length / limitNum),
      },
      location,
      notice: 'Live hotel data unavailable. Showing local listings. Add SERPAPI_KEY for real-time data.',
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/flights ─────────────────────────────────────────────────────────
// Returns real flights from SerpAPI
async function getFlights(req, res, next) {
  try {
    const { from, to, departDate, returnDate } = req.query;

    if (!from || !to || !departDate) {
      return res.status(400).json({
        error: 'from, to, and departDate are required',
        example: '/api/flights?from=BOM&to=GOI&departDate=2026-05-01',
      });
    }

    const flights = await serpapi.searchFlights(from, to, departDate, returnDate);

    if (flights && flights.length > 0) {
      return res.json({
        source: 'serpapi',
        flights,
        from,
        to,
        departDate,
        returnDate: returnDate || null,
        total: flights.length,
      });
    }

    // Fallback: curated static flight data for common Indian routes
    const fallbackFlights = generateFallbackFlights(from, to, departDate);
    res.json({
      source: 'fallback',
      flights: fallbackFlights,
      from,
      to,
      departDate,
      notice: 'Live flight data unavailable. Showing estimated data. Add SERPAPI_KEY for real-time flights.',
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/attractions ─────────────────────────────────────────────────────
// Returns attractions from SerpAPI (TripAdvisor), falls back to OSM Overpass
async function getAttractions(req, res, next) {
  try {
    const { location, lat, lng } = req.query;

    if (!location && (!lat || !lng)) {
      return res.status(400).json({ error: 'location or lat+lng required' });
    }

    // ── Try SerpAPI TripAdvisor ────────────────────────────────────────────
    if (location) {
      const serpAttractions = await serpapi.searchAttractions(location);
      if (serpAttractions && serpAttractions.length > 0) {
        return res.json({ source: 'serpapi', attractions: serpAttractions, location });
      }
    }

    // ── Fallback: OSM Overpass API ─────────────────────────────────────────
    if (lat && lng) {
      try {
        const query = `[out:json][timeout:15];(node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:5000,${lat},${lng});node["amenity"~"restaurant|cafe"](around:2000,${lat},${lng}););out 10;`;
        const osmRes = await axios.get(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
          { headers: OSM_HEADERS, timeout: 12000 }
        );
        const places = (osmRes.data?.elements || [])
          .filter(e => e.tags?.name)
          .slice(0, 8)
          .map(e => ({
            id: `osm_${e.id}`,
            source: 'openstreetmap',
            name: e.tags.name,
            type: e.tags.tourism || e.tags.amenity || 'place',
            rating: 0,
            reviewCount: 0,
            description: '',
            image: null,
            location: location || `${lat},${lng}`,
            price: 'Free',
          }));

        return res.json({ source: 'openstreetmap', attractions: places, location: location || `${lat},${lng}` });
      } catch {
        // OSM also failed
      }
    }

    res.json({
      source: 'unavailable',
      attractions: [],
      notice: 'Attraction data currently unavailable.',
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/explore ─────────────────────────────────────────────────────────
// Returns trending destinations from SerpAPI Travel Explore, falls back to curated list
async function getExplore(req, res, next) {
  try {
    const { from = 'Mumbai' } = req.query;

    // ── Try SerpAPI Travel Explore ─────────────────────────────────────────
    const serpDests = await serpapi.getTravelExplore(from);
    if (serpDests && serpDests.length > 0) {
      return res.json({ source: 'serpapi', destinations: serpDests, from });
    }

    // ── Fallback: curated Indian destinations with real coordinates ────────
    const db = getDB();
    const CURATED = [
      { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.1240, emoji: '🏖️', tag: 'Beach Paradise' },
      { name: 'Manali', state: 'Himachal Pradesh', lat: 32.2396, lng: 77.1887, emoji: '⛰️', tag: 'Mountain Escape' },
      { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, emoji: '🏰', tag: 'Pink City' },
      { name: 'Kerala', state: 'Kerala', lat: 10.8505, lng: 76.2711, emoji: '🌴', tag: "God's Own Country" },
      { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, emoji: '🏛️', tag: 'City of Lakes' },
      { name: 'Coorg', state: 'Karnataka', lat: 12.3375, lng: 75.8069, emoji: '☕', tag: 'Coffee Country' },
      { name: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676, emoji: '🧘', tag: 'Yoga Capital' },
      { name: 'Andaman', state: 'Andaman & Nicobar', lat: 11.7401, lng: 92.6586, emoji: '🐠', tag: 'Island Getaway' },
    ];

    const enriched = await Promise.all(CURATED.map(async dest => {
      try {
        const snap = await db.collection('properties').where('location.city', '==', dest.name).where('isActive', '==', true).get();
        return { ...dest, source: 'curated', propertyCount: snap.docs.length };
      } catch {
        return { ...dest, source: 'curated', propertyCount: 0 };
      }
    }));

    res.json({
      source: 'curated',
      destinations: enriched,
      notice: 'Live destination data unavailable. Add SERPAPI_KEY for real-time suggestions.',
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/distance ────────────────────────────────────────────────────────
// Returns distance/travel time from SerpAPI Maps, falls back to OSRM/Haversine
async function getDistance(req, res, next) {
  try {
    const { from, to, fromLat, fromLng, toLat, toLng } = req.query;

    if (!from && !to && (!fromLat || !toLat)) {
      return res.status(400).json({ error: 'Provide from+to addresses or fromLat+fromLng+toLat+toLng' });
    }

    // ── Try SerpAPI Maps ───────────────────────────────────────────────────
    if (from && to) {
      const serpDist = await serpapi.getMapDistance(from, to);
      if (serpDist?.distanceKm) {
        return res.json({ ...serpDist, from, to });
      }
    }

    // ── Fallback: OSRM routing (free) ──────────────────────────────────────
    const lat1 = parseFloat(fromLat);
    const lng1 = parseFloat(fromLng);
    const lat2 = parseFloat(toLat);
    const lng2 = parseFloat(toLng);

    if (lat1 && lng1 && lat2 && lng2) {
      try {
        const osrmRes = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`,
          { headers: OSM_HEADERS, timeout: 6000 }
        );
        if (osrmRes.data?.routes?.length > 0) {
          const route = osrmRes.data.routes[0];
          const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
          const durationMinutes = Math.round(route.duration / 60);
          return res.json({
            source: 'osrm',
            distanceKm,
            distanceText: `${distanceKm} km`,
            durationMinutes,
            durationText: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
          });
        }
      } catch { /* fallback to Haversine */ }

      // Haversine fallback
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const distanceKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
      const durationMinutes = Math.round((distanceKm / 35) * 60);

      return res.json({
        source: 'haversine',
        distanceKm,
        distanceText: `${distanceKm} km`,
        durationMinutes,
        durationText: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      });
    }

    res.status(400).json({ error: 'Could not calculate distance. Provide valid coordinates.' });
  } catch (error) {
    next(error);
  }
}

// ─── Fallback flight data generator ──────────────────────────────────────────
// Generates realistic (not random) flight data for common Indian routes
function generateFallbackFlights(from, to, departDate) {
  const AIRLINES = [
    { name: 'IndiGo', code: '6E', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/IndiGo_Airlines_logo.svg/200px-IndiGo_Airlines_logo.svg.png' },
    { name: 'Air India', code: 'AI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Air_India_Logo.svg/200px-Air_India_Logo.svg.png' },
    { name: 'SpiceJet', code: 'SG', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/SpiceJet_logo.svg/200px-SpiceJet_logo.svg.png' },
    { name: 'Vistara', code: 'UK', logo: null },
    { name: 'Go First', code: 'G8', logo: null },
  ];

  // Base prices for common routes (INR)
  const BASE_PRICES = { short: 3500, medium: 5500, long: 8500 };
  const DURATIONS = { short: 75, medium: 120, long: 180 }; // minutes

  const routeLen = (from.length + to.length) > 6 ? 'medium' : 'short';

  return AIRLINES.slice(0, 4).map((airline, i) => {
    const basePrice = BASE_PRICES[routeLen] + (i * 800);
    const duration = DURATIONS[routeLen] + (i * 15);
    const departHour = 6 + (i * 3);

    return {
      id: `fallback_${from}_${to}_${i}`,
      source: 'fallback',
      airline: airline.name,
      airlineLogo: airline.logo,
      flightNumber: `${airline.code}${100 + i * 111}`,
      from,
      to,
      departureTime: `${String(departHour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
      arrivalTime: `${String(departHour + Math.floor(duration / 60)).padStart(2, '0')}:${String((i * 30) % 60).padStart(2, '0')}`,
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      durationMinutes: duration,
      price: basePrice,
      currency: 'INR',
      stops: i === 3 ? 1 : 0,
      class: 'Economy',
    };
  });
}

module.exports = { getHotels, getFlights, getAttractions, getExplore, getDistance };
