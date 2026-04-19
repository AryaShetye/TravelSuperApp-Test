/**
 * Property Controller — Firebase/In-Memory DB
 */

const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// ─── Geocode address using OpenStreetMap (free, no key) ───────────────────────
async function geocodeAddress(address) {
  try {
    const encoded = encodeURIComponent(address);
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0' }, timeout: 3000 }
    );
    if (res.data && res.data.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
    }
  } catch {
    // Fallback to India center
  }
  return { lat: 20.5937, lng: 78.9629 };
}

// ─── GET /api/properties ──────────────────────────────────────────────────────
async function getProperties(req, res, next) {
  try {
    const { city, propertyType, minPrice, maxPrice, guests, page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const db = getDB();

    let query = db.collection('properties').where('isActive', '==', true);

    if (city) query = query.where('location.city', '==', city);
    if (propertyType) query = query.where('propertyType', '==', propertyType);

    const snapshot = await query.get();
    let properties = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    // Client-side filters (in-memory doesn't support compound queries)
    if (minPrice) properties = properties.filter(p => p.pricePerNight >= parseFloat(minPrice));
    if (maxPrice) properties = properties.filter(p => p.pricePerNight <= parseFloat(maxPrice));
    if (guests) properties = properties.filter(p => p.maxGuests >= parseInt(guests));

    // Sort
    properties.sort((a, b) => {
      let aVal = sortBy.includes('.') ? sortBy.split('.').reduce((o, k) => o?.[k], a) : a[sortBy];
      let bVal = sortBy.includes('.') ? sortBy.split('.').reduce((o, k) => o?.[k], b) : b[sortBy];
      aVal = aVal || 0;
      bVal = bVal || 0;
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    const total = properties.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = properties.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      properties: paginated,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/properties/:id ──────────────────────────────────────────────────
async function getProperty(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('properties').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = { ...doc.data(), id: doc.id };
    if (!property.isActive) return res.status(404).json({ error: 'Property not found' });

    // Increment view count (fire and forget)
    db.collection('properties').doc(req.params.id).update({ viewCount: (property.viewCount || 0) + 1 }).catch(() => {});

    res.json({ property });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/properties ─────────────────────────────────────────────────────
async function createProperty(req, res, next) {
  try {
    const {
      title, description, propertyType, maxGuests, bedrooms, beds, bathrooms,
      pricePerNight, cleaningFee, securityDeposit, weeklyDiscount, monthlyDiscount,
      address, city, state, country, zipCode,
      amenities, houseRules, minimumStay, maximumStay, instantBook,
    } = req.body;

    const db = getDB();

    // Geocode
    const coords = await geocodeAddress(`${address}, ${city}, ${state}, ${country || 'India'}`);

    // Handle images
    let images = [];
    if (req.files && req.files.length > 0) {
      const { uploadMultipleImages } = require('../services/cloudinary.service');
      images = await uploadMultipleImages(req.files, `travel-superapp/properties/${req.user.id}`);
    } else if (req.body.images) {
      images = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
    }

    if (images.length === 0) {
      return res.status(400).json({ error: 'At least one property image is required' });
    }

    const id = uuidv4();
    const property = {
      id,
      hostId: req.user.id,
      hostName: `${req.user.firstName} ${req.user.lastName}`,
      hostAvatar: req.user.avatar || null,
      title,
      description,
      propertyType,
      maxGuests: parseInt(maxGuests),
      bedrooms: parseInt(bedrooms),
      beds: parseInt(beds),
      bathrooms: parseFloat(bathrooms),
      pricePerNight: parseFloat(pricePerNight),
      cleaningFee: parseFloat(cleaningFee) || 0,
      securityDeposit: parseFloat(securityDeposit) || 0,
      weeklyDiscount: parseFloat(weeklyDiscount) || 0,
      monthlyDiscount: parseFloat(monthlyDiscount) || 0,
      location: {
        address,
        city,
        state,
        country: country || 'India',
        zipCode: zipCode || '',
        lat: coords.lat,
        lng: coords.lng,
        formattedAddress: `${address}, ${city}, ${state}`,
      },
      images,
      amenities: typeof amenities === 'string' ? JSON.parse(amenities) : (amenities || []),
      houseRules: typeof houseRules === 'string' ? JSON.parse(houseRules) : (houseRules || {}),
      minimumStay: parseInt(minimumStay) || 1,
      maximumStay: parseInt(maximumStay) || 365,
      instantBook: instantBook === 'true' || instantBook === true,
      isAvailable: true,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      rating: { average: 0, count: 0 },
      blockedDates: [],
      revenue: { total: 0, monthly: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('properties').doc(id).set(property);

    res.status(201).json({ message: 'Property listed successfully', property });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/properties/:id ──────────────────────────────────────────────────
async function updateProperty(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('properties').doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Property not found' });

    const property = doc.data();
    if (property.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.id;
    delete updates.hostId;

    await db.collection('properties').doc(req.params.id).update(updates);

    const updated = await db.collection('properties').doc(req.params.id).get();
    res.json({ message: 'Property updated', property: updated.data() });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/properties/:id ───────────────────────────────────────────────
async function deleteProperty(req, res, next) {
  try {
    const db = getDB();
    const doc = await db.collection('properties').doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Property not found' });

    const property = doc.data();
    if (property.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('properties').doc(req.params.id).update({ isActive: false });
    res.json({ message: 'Property removed successfully' });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/properties/suggestions ─────────────────────────────────────────
async function getLocationSuggestions(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ suggestions: [] });

    const encoded = encodeURIComponent(q.trim());
    const response = await axios.get(
      `https://photon.komoot.io/api/?q=${encoded}&limit=5&lang=en`,
      { headers: { 'User-Agent': process.env.OSM_USER_AGENT || 'TravelSuperApp/1.0' }, timeout: 3000 }
    );

    const suggestions = (response.data?.features || []).map(f => ({
      label: [f.properties.name, f.properties.city, f.properties.country].filter(Boolean).join(', '),
      city: f.properties.city || f.properties.name,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }));

    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
}

module.exports = { getProperties, getProperty, createProperty, updateProperty, deleteProperty, getLocationSuggestions };
