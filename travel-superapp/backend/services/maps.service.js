/**
 * Maps Service — OpenStreetMap / Nominatim + Photon
 *
 * 100% FREE — no API key required.
 *
 * Services used:
 *  - Nominatim (nominatim.openstreetmap.org) — geocoding & reverse geocoding
 *  - Photon    (photon.komoot.io)             — fast autocomplete suggestions
 *
 * Usage policy:
 *  - Nominatim: max 1 req/sec, include a descriptive User-Agent
 *  - Photon:    no hard limit for reasonable use
 *
 * For high-traffic production, self-host Nominatim or use a paid OSM provider
 * such as Geoapify (free tier: 3000 req/day) or LocationIQ.
 */

const axios = require('axios');

// Shared headers — Nominatim requires a meaningful User-Agent
const OSM_HEADERS = {
  'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0 (contact@travelsuperapp.com)',
  'Accept-Language': 'en',
};

// Simple in-memory rate-limiter for Nominatim (1 req/sec)
let lastNominatimCall = 0;
async function nominatimThrottle() {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastNominatimCall = Date.now();
}

// ─── Geocode address → coordinates ───────────────────────────────────────────
/**
 * Convert a human-readable address to lat/lng using Nominatim.
 * @param {string} address  e.g. "12 Beach Road, Calangute, Goa, India"
 * @returns {Promise<{lat, lng, formattedAddress, osmId}>}
 */
async function geocodeAddress(address) {
  await nominatimThrottle();

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      headers: OSM_HEADERS,
      params: {
        q: address,
        format: 'jsonv2',
        addressdetails: 1,
        limit: 1,
        countrycodes: 'in',   // bias to India
      },
      timeout: 8000,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Address not found');
    }

    const result = response.data[0];

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      formattedAddress: result.display_name,
      osmId: result.osm_id,
      osmType: result.osm_type,
    };
  } catch (error) {
    console.error('Nominatim geocoding error:', error.message);
    // Return a fallback so property creation doesn't fail
    return {
      lat: 20.5937,   // geographic centre of India
      lng: 78.9629,
      formattedAddress: address,
      osmId: null,
    };
  }
}

// ─── Reverse geocode coordinates → address ───────────────────────────────────
/**
 * Convert lat/lng back to a human-readable address.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{formattedAddress, city, state, country}>}
 */
async function reverseGeocode(lat, lng) {
  await nominatimThrottle();

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      headers: OSM_HEADERS,
      params: {
        lat,
        lon: lng,
        format: 'jsonv2',
        addressdetails: 1,
      },
      timeout: 8000,
    });

    const data = response.data;
    const addr = data.address || {};

    return {
      formattedAddress: data.display_name,
      city: addr.city || addr.town || addr.village || addr.county || '',
      state: addr.state || '',
      country: addr.country || 'India',
      postcode: addr.postcode || '',
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return { formattedAddress: `${lat}, ${lng}`, city: '', state: '', country: 'India' };
  }
}

// ─── Autocomplete suggestions (Photon) ───────────────────────────────────────
/**
 * Fast city/place autocomplete using Photon (powered by OSM data).
 * No API key, no rate limit for normal use.
 * @param {string} input  Partial text typed by user
 * @returns {Promise<Array<{description, lat, lng, city, state}>>}
 */
async function getAutocompleteSuggestions(input) {
  if (!input || input.trim().length < 2) return [];

  try {
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: {
        q: input,
        limit: 7,
        lang: 'en',
        // Bounding box roughly covering India
        bbox: '68.1766451354,7.96553477623,97.4025614766,35.4940095078',
      },
      timeout: 6000,
    });

    const features = response.data?.features || [];

    return features
      .filter((f) => {
        // Only return cities, towns, villages, states — not individual streets
        const type = f.properties?.type || '';
        return ['city', 'town', 'village', 'state', 'district', 'county'].includes(type);
      })
      .map((f) => {
        const p = f.properties;
        const parts = [p.name, p.state, p.country].filter(Boolean);
        return {
          description: parts.join(', '),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          city: p.name || '',
          state: p.state || '',
          country: p.country || 'India',
          osmId: p.osm_id,
        };
      });
  } catch (error) {
    console.error('Photon autocomplete error:', error.message);
    return [];
  }
}

// ─── Nominatim city search (fallback / server-side search) ───────────────────
/**
 * Search for a city/place by name — used server-side for property search.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchPlaces(query) {
  await nominatimThrottle();

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      headers: OSM_HEADERS,
      params: {
        q: query,
        format: 'jsonv2',
        addressdetails: 1,
        limit: 5,
        countrycodes: 'in',
      },
      timeout: 8000,
    });

    return (response.data || []).map((r) => ({
      osmId: r.osm_id,
      name: r.name || r.display_name.split(',')[0],
      address: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch (error) {
    console.error('Nominatim search error:', error.message);
    return [];
  }
}

// ─── Haversine distance ───────────────────────────────────────────────────────
/**
 * Calculate straight-line distance between two coordinates.
 * @returns {number} Distance in kilometres
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  getAutocompleteSuggestions,
  searchPlaces,
  calculateDistance,
};
