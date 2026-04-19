/**
 * SerpAPI Service Layer
 * Fetches real-time travel data: hotels, flights, attractions, destinations
 *
 * Docs: https://serpapi.com
 * Free tier: 100 searches/month
 *
 * Graceful degradation: if SERPAPI_KEY is missing or quota exceeded,
 * all functions return null so callers can fall back to local data.
 */

const axios = require('axios');

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const KEY = () => process.env.SERPAPI_KEY;

// ─── In-memory cache (5-minute TTL) ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Core request helper ──────────────────────────────────────────────────────
async function serpRequest(params) {
  const apiKey = KEY();
  if (!apiKey || apiKey === 'your_serpapi_key_here') {
    return null; // No key configured — caller will use fallback
  }

  const cacheKey = JSON.stringify(params);
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get(SERPAPI_BASE, {
      params: { ...params, api_key: apiKey },
      timeout: 10000,
    });
    cacheSet(cacheKey, res.data);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.message;
    console.warn(`[SerpAPI] ${params.engine} failed (${status}): ${msg}`);
    return null; // Graceful degradation
  }
}

// ─── 1. Hotels ────────────────────────────────────────────────────────────────
/**
 * Search hotels via Google Hotels API
 * @param {string} location - City or destination
 * @param {string} checkIn  - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 * @param {number} adults   - Number of guests
 * @returns {Array|null} Normalized hotel list, or null if unavailable
 */
async function searchHotels(location, checkIn, checkOut, adults = 2) {
  const data = await serpRequest({
    engine: 'google_hotels',
    q: location,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults,
    currency: 'INR',
    gl: 'in',
    hl: 'en',
  });

  if (!data?.properties) return null;

  return data.properties.map(h => ({
    id: `serp_hotel_${h.property_token || h.name?.replace(/\s+/g, '_')}`,
    source: 'serpapi',
    title: h.name,
    description: h.description || `${h.name} in ${location}`,
    propertyType: 'hotel',
    location: {
      city: location,
      state: '',
      country: 'India',
      formattedAddress: h.location || location,
      lat: h.gps_coordinates?.latitude || null,
      lng: h.gps_coordinates?.longitude || null,
    },
    pricePerNight: h.rate_per_night?.extracted_lowest || h.rate_per_night?.lowest
      ? parseFloat(String(h.rate_per_night.extracted_lowest || h.rate_per_night.lowest).replace(/[^0-9.]/g, ''))
      : null,
    currency: 'INR',
    rating: {
      average: h.overall_rating || 0,
      count: h.reviews || 0,
    },
    images: (h.images || []).slice(0, 5).map(img => ({
      url: img.original_image || img.thumbnail,
      caption: img.author || '',
    })),
    amenities: (h.amenities || []).slice(0, 8).map(a => ({ name: a, icon: '✓' })),
    isAvailable: true,
    isActive: true,
    hostName: h.name,
    checkIn: checkIn,
    checkOut: checkOut,
    serpToken: h.property_token,
  }));
}

// ─── 2. Flights ───────────────────────────────────────────────────────────────
/**
 * Search flights via Google Flights API
 * @param {string} from       - IATA code or city (e.g. "BOM", "Mumbai")
 * @param {string} to         - IATA code or city (e.g. "GOI", "Goa")
 * @param {string} departDate - YYYY-MM-DD
 * @param {string} returnDate - YYYY-MM-DD (optional, for round trip)
 * @returns {Array|null} Normalized flight list, or null if unavailable
 */
async function searchFlights(from, to, departDate, returnDate = null) {
  const params = {
    engine: 'google_flights',
    departure_id: from,
    arrival_id: to,
    outbound_date: departDate,
    currency: 'INR',
    hl: 'en',
    gl: 'in',
    type: returnDate ? '1' : '2', // 1=round trip, 2=one way
  };
  if (returnDate) params.return_date = returnDate;

  const data = await serpRequest(params);
  if (!data) return null;

  const allFlights = [
    ...(data.best_flights || []),
    ...(data.other_flights || []),
  ];

  return allFlights.slice(0, 10).map((f, idx) => {
    const leg = f.flights?.[0] || {};
    return {
      id: `serp_flight_${idx}_${leg.flight_number || idx}`,
      source: 'serpapi',
      airline: leg.airline || 'Unknown Airline',
      airlineLogo: leg.airline_logo || null,
      flightNumber: leg.flight_number || '',
      from: leg.departure_airport?.name || from,
      fromCode: leg.departure_airport?.id || from,
      to: leg.arrival_airport?.name || to,
      toCode: leg.arrival_airport?.id || to,
      departureTime: leg.departure_airport?.time || '',
      arrivalTime: leg.arrival_airport?.time || '',
      duration: f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : '',
      durationMinutes: f.total_duration || 0,
      price: f.price || null,
      currency: 'INR',
      stops: (f.flights?.length || 1) - 1,
      class: leg.travel_class || 'Economy',
      carbon: f.carbon_emissions?.this_flight || null,
    };
  });
}

// ─── 3. Attractions / Reviews (TripAdvisor) ───────────────────────────────────
/**
 * Search attractions via TripAdvisor API
 * Uses the correct SerpAPI TripAdvisor engine with location search
 * @param {string} location - City name
 * @returns {Array|null} Normalized attractions list, or null if unavailable
 */
async function searchAttractions(location) {
  // TripAdvisor search — correct engine and params per SerpAPI docs
  const data = await serpRequest({
    engine: 'tripadvisor',
    q: location,
    language: 'en',
  });

  if (!data) return null;

  // TripAdvisor returns results in data.results array
  const results = data.results || data.attractions || [];
  if (results.length === 0) return null;

  return results.slice(0, 8).map((r, idx) => ({
    id: `serp_attr_${idx}_${r.location_id || idx}`,
    source: 'serpapi',
    name: r.name || r.title || 'Unknown',
    type: r.subcategory?.[0]?.name || r.category?.name || r.type || 'attraction',
    rating: parseFloat(r.rating) || 0,
    reviewCount: parseInt(r.num_reviews) || 0,
    description: r.description || r.ranking_string || '',
    image: r.photo?.images?.medium?.url || r.photo?.images?.small?.url || r.thumbnail || null,
    location: r.location_string || r.address_obj?.city || location,
    price: r.price_level || r.price || 'Free',
    url: r.web_url || null,
    rankingPosition: r.ranking_position || null,
  }));
}

// ─── 4. Destinations / Travel Explore ────────────────────────────────────────
/**
 * Get trending destinations via Google Travel Explore
 * @param {string} from - Origin city/airport code
 * @returns {Array|null} Trending destinations, or null if unavailable
 */
async function getTravelExplore(from = 'Mumbai') {
  const data = await serpRequest({
    engine: 'google_travel_explore',
    departure_id: from,
    hl: 'en',
    gl: 'in',
    currency: 'INR',
  });

  if (!data?.destinations) return null;

  return (data.destinations || []).slice(0, 12).map(d => ({
    id: `serp_dest_${d.destination?.id || d.destination?.name}`,
    source: 'serpapi',
    name: d.destination?.name || '',
    country: d.destination?.country || 'India',
    image: d.destination?.image || null,
    price: d.price?.lowest || null,
    currency: 'INR',
    flightDuration: d.flight_duration || null,
  }));
}

// ─── 5. Maps / Distance ───────────────────────────────────────────────────────
/**
 * Get distance and travel time via Google Maps API
 * @param {string} from - Origin address
 * @param {string} to   - Destination address
 * @returns {Object|null} Distance info, or null if unavailable
 */
async function getMapDistance(from, to) {
  const data = await serpRequest({
    engine: 'google_maps',
    q: `directions from ${from} to ${to}`,
    type: 'directions',
    hl: 'en',
  });

  if (!data?.directions) return null;

  const dir = data.directions[0];
  return {
    source: 'serpapi',
    distanceText: dir?.distance?.text || '',
    distanceKm: dir?.distance?.value ? dir.distance.value / 1000 : null,
    durationText: dir?.duration?.text || '',
    durationMinutes: dir?.duration?.value ? Math.round(dir.duration.value / 60) : null,
  };
}

module.exports = {
  searchHotels,
  searchFlights,
  searchAttractions,
  getTravelExplore,
  getMapDistance,
};
