/**
 * Seed Script — Firebase/In-Memory DB
 * Seeds users, properties, and packages on server startup
 * Uses the required names: Arya Shetye, Chaitali Kulkarni, etc.
 */

const bcrypt = require('bcryptjs');
const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const HASHED_PASSWORD_CACHE = {};

async function hashPassword(password) {
  if (!HASHED_PASSWORD_CACHE[password]) {
    HASHED_PASSWORD_CACHE[password] = await bcrypt.hash(password, 10);
  }
  return HASHED_PASSWORD_CACHE[password];
}

async function seedData() {
  const db = getDB();

  // ─── Check if already seeded ──────────────────────────────────────────────
  const existingSnap = await db.collection('users').where('email', '==', 'arya@travelsuperapp.com').get();
  const adminSnap = await db.collection('users').where('email', '==', 'admin@travelsuperapp.com').get();

  if (!existingSnap.empty && !adminSnap.empty) {
    console.log('✅ Seed data already present — skipping');
    return;
  }

  // If admin is missing but other users exist, just add admin
  if (!existingSnap.empty && adminSnap.empty) {
    console.log('🌱 Adding missing admin user...');
    const pass = await hashPassword('Test@1234');
    const adminId = uuidv4();
    await db.collection('users').doc(adminId).set({
      id: adminId, firstName: 'Admin', lastName: 'User',
      email: 'admin@travelsuperapp.com', role: 'admin', phone: '+919876543216',
      password: pass, avatar: null, isVerified: true, isActive: true,
      preferredLanguage: 'en', preferredCurrency: 'INR', lastLoginAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    console.log('✅ Admin user added: admin@travelsuperapp.com');
    return;
  }

  console.log('\n🌱 Seeding database with initial data...\n');

  const pass = await hashPassword('Test@1234');

  // ─── Users ────────────────────────────────────────────────────────────────
  const users = [
    { id: uuidv4(), firstName: 'Arya',     lastName: 'Shetye',    email: 'arya@travelsuperapp.com',     role: 'traveler',         phone: '+919876543210' },
    { id: uuidv4(), firstName: 'Chaitali', lastName: 'Kulkarni',  email: 'chaitali@travelsuperapp.com', role: 'agent',            phone: '+919876543211' },
    { id: uuidv4(), firstName: 'Siddhi',   lastName: 'Uttarwar',  email: 'siddhi@travelsuperapp.com',   role: 'property_manager', phone: '+919876543212' },
    { id: uuidv4(), firstName: 'Snehal',   lastName: 'Meshram',   email: 'snehal@travelsuperapp.com',   role: 'driver',           phone: '+919876543213' },
    { id: uuidv4(), firstName: 'Aarya',    lastName: 'Kulkarni',  email: 'aarya@travelsuperapp.com',    role: 'agent',            phone: '+919876543214' },
    { id: uuidv4(), firstName: 'Shruti',   lastName: 'Shinde',    email: 'shruti@travelsuperapp.com',   role: 'traveler',         phone: '+919876543215' },
    { id: uuidv4(), firstName: 'Admin',    lastName: 'User',      email: 'admin@travelsuperapp.com',    role: 'admin',            phone: '+919876543216' },
  ];

  for (const u of users) {
    const userData = {
      ...u,
      password: pass,
      avatar: null,
      isVerified: true,
      isActive: true,
      preferredLanguage: 'en',
      preferredCurrency: 'INR',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection('users').doc(u.id).set(userData);
    console.log(`✅ User: ${u.firstName} ${u.lastName} (${u.role})`);
  }

  const host = users.find(u => u.role === 'agent');   // Chaitali is now Travel Agent
  const manager = users.find(u => u.role === 'property_manager');
  const agent = users.find(u => u.firstName === 'Aarya'); // Aarya Kulkarni is also agent

  // ─── Properties ───────────────────────────────────────────────────────────
  const properties = [
    {
      hostId: host.id,
      hostName: `${host.firstName} ${host.lastName}`,
      title: 'Cozy Beachside Cottage in Goa',
      description: 'Wake up to the sound of waves in this charming cottage just 50 meters from the beach. Perfect for couples and small families looking for a peaceful retreat. Features a private garden, outdoor shower, and stunning sea views.',
      propertyType: 'cottage',
      maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 1,
      pricePerNight: 3500, cleaningFee: 500, securityDeposit: 1000,
      weeklyDiscount: 5, monthlyDiscount: 10,
      location: { address: '12 Beach Road, Calangute', city: 'Goa', state: 'Goa', country: 'India', zipCode: '403516', lat: 15.5449, lng: 73.7553, formattedAddress: '12 Beach Road, Calangute, Goa' },
      images: [
        { url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', isPrimary: true, caption: 'Beachside cottage' },
        { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', isPrimary: false, caption: 'Living area' },
      ],
      amenities: [{ name: 'WiFi', icon: '📶' }, { name: 'Air Conditioning', icon: '❄️' }, { name: 'Kitchen', icon: '🍳' }, { name: 'Beach Access', icon: '🏖️' }, { name: 'Parking', icon: '🚗' }],
      houseRules: { checkInTime: '14:00', checkOutTime: '11:00', smokingAllowed: false, petsAllowed: false },
      tags: ['beach', 'goa', 'cottage', 'sea view'],
      isFeatured: true, minimumStay: 1, maximumStay: 30,
    },
    {
      hostId: host.id,
      hostName: `${host.firstName} ${host.lastName}`,
      title: 'Luxury Villa with Private Pool in Udaipur',
      description: 'Experience royal Rajasthani hospitality in this stunning heritage villa overlooking Lake Pichola. Features traditional architecture with modern amenities, a private infinity pool, and a rooftop terrace with panoramic lake views.',
      propertyType: 'villa',
      maxGuests: 8, bedrooms: 4, beds: 5, bathrooms: 4,
      pricePerNight: 12000, cleaningFee: 1500, securityDeposit: 5000,
      weeklyDiscount: 10, monthlyDiscount: 15,
      location: { address: '45 Lake Palace Road', city: 'Udaipur', state: 'Rajasthan', country: 'India', zipCode: '313001', lat: 24.5854, lng: 73.6833, formattedAddress: '45 Lake Palace Road, Udaipur, Rajasthan' },
      images: [
        { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', isPrimary: true, caption: 'Villa with pool' },
        { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', isPrimary: false, caption: 'Master bedroom' },
      ],
      amenities: [{ name: 'Private Pool', icon: '🏊' }, { name: 'WiFi', icon: '📶' }, { name: 'Air Conditioning', icon: '❄️' }, { name: 'Full Kitchen', icon: '🍳' }, { name: 'Lake View', icon: '🏞️' }, { name: 'Parking', icon: '🚗' }],
      houseRules: { checkInTime: '15:00', checkOutTime: '12:00', smokingAllowed: false, petsAllowed: true },
      tags: ['villa', 'udaipur', 'pool', 'lake view', 'luxury'],
      isFeatured: true, minimumStay: 2, maximumStay: 30,
    },
    {
      hostId: manager.id,
      hostName: `${manager.firstName} ${manager.lastName}`,
      title: 'Himalayan Farmhouse Stay in Manali',
      description: 'Escape to the mountains in this authentic wooden farmhouse surrounded by apple orchards and pine forests. Located at 2100m altitude with breathtaking views of the Kullu Valley.',
      propertyType: 'farmhouse',
      maxGuests: 6, bedrooms: 3, beds: 4, bathrooms: 2,
      pricePerNight: 4500, cleaningFee: 600, securityDeposit: 2000,
      weeklyDiscount: 8, monthlyDiscount: 12,
      location: { address: 'Old Manali Village', city: 'Manali', state: 'Himachal Pradesh', country: 'India', zipCode: '175131', lat: 32.2396, lng: 77.1892, formattedAddress: 'Old Manali Village, Manali, Himachal Pradesh' },
      images: [
        { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', isPrimary: true, caption: 'Mountain farmhouse' },
        { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800', isPrimary: false, caption: 'Valley view' },
      ],
      amenities: [{ name: 'Mountain View', icon: '⛰️' }, { name: 'Fireplace', icon: '🔥' }, { name: 'Kitchen', icon: '🍳' }, { name: 'Organic Garden', icon: '🌿' }, { name: 'Parking', icon: '🚗' }],
      houseRules: { checkInTime: '13:00', checkOutTime: '11:00', smokingAllowed: false, petsAllowed: true },
      tags: ['mountains', 'manali', 'farmhouse', 'nature', 'trekking'],
      isFeatured: true, minimumStay: 2, maximumStay: 14,
    },
    {
      hostId: manager.id,
      hostName: `${manager.firstName} ${manager.lastName}`,
      title: 'Heritage Haveli in Jaipur Old City',
      description: 'Stay in a beautifully restored 200-year-old haveli in the heart of Jaipur\'s old city. Intricate frescoes, traditional courtyards, and rooftop dining with views of the Pink City.',
      propertyType: 'entire_home',
      maxGuests: 10, bedrooms: 5, beds: 6, bathrooms: 5,
      pricePerNight: 8500, cleaningFee: 1200, securityDeposit: 3000,
      weeklyDiscount: 10, monthlyDiscount: 0,
      location: { address: 'Chandpole Bazaar', city: 'Jaipur', state: 'Rajasthan', country: 'India', zipCode: '302001', lat: 26.9124, lng: 75.7873, formattedAddress: 'Chandpole Bazaar, Jaipur, Rajasthan' },
      images: [
        { url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800', isPrimary: true, caption: 'Haveli courtyard' },
        { url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800', isPrimary: false, caption: 'Rooftop view' },
      ],
      amenities: [{ name: 'WiFi', icon: '📶' }, { name: 'Air Conditioning', icon: '❄️' }, { name: 'Rooftop', icon: '🏛️' }, { name: 'Heritage Architecture', icon: '🏰' }, { name: 'Parking', icon: '🚗' }],
      houseRules: { checkInTime: '14:00', checkOutTime: '12:00', smokingAllowed: false, petsAllowed: false },
      tags: ['heritage', 'jaipur', 'haveli', 'rajasthan', 'culture'],
      isFeatured: true, minimumStay: 1, maximumStay: 30,
    },
    {
      hostId: host.id,
      hostName: `${host.firstName} ${host.lastName}`,
      title: 'Backwater Houseboat in Kerala',
      description: 'Float through the serene backwaters of Kerala on this traditional kettuvallam houseboat. Includes a private chef, AC bedrooms, and guided village tours.',
      propertyType: 'entire_home',
      maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 2,
      pricePerNight: 9500, cleaningFee: 800, securityDeposit: 2000,
      weeklyDiscount: 0, monthlyDiscount: 0,
      location: { address: 'Alleppey Backwaters', city: 'Alleppey', state: 'Kerala', country: 'India', zipCode: '688001', lat: 9.4981, lng: 76.3388, formattedAddress: 'Alleppey Backwaters, Kerala' },
      images: [
        { url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800', isPrimary: true, caption: 'Houseboat on backwaters' },
        { url: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800', isPrimary: false, caption: 'Bedroom' },
      ],
      amenities: [{ name: 'Private Chef', icon: '👨‍🍳' }, { name: 'Air Conditioning', icon: '❄️' }, { name: 'Backwater View', icon: '🌊' }, { name: 'Guided Tours', icon: '🗺️' }],
      houseRules: { checkInTime: '12:00', checkOutTime: '10:00', smokingAllowed: false, petsAllowed: false },
      tags: ['houseboat', 'kerala', 'backwaters', 'nature', 'luxury'],
      isFeatured: false, minimumStay: 1, maximumStay: 7,
    },
    {
      hostId: manager.id,
      hostName: `${manager.firstName} ${manager.lastName}`,
      title: 'Treehouse Retreat in Coorg',
      description: 'Perched among coffee and spice plantations, this unique treehouse offers an immersive nature experience. Wake up to birdsong and misty mountain views.',
      propertyType: 'cottage',
      maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
      pricePerNight: 5500, cleaningFee: 400, securityDeposit: 1500,
      weeklyDiscount: 5, monthlyDiscount: 0,
      location: { address: 'Madikeri Coffee Estate', city: 'Coorg', state: 'Karnataka', country: 'India', zipCode: '571201', lat: 12.4244, lng: 75.7382, formattedAddress: 'Madikeri Coffee Estate, Coorg, Karnataka' },
      images: [
        { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', isPrimary: true, caption: 'Treehouse exterior' },
        { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', isPrimary: false, caption: 'Forest view' },
      ],
      amenities: [{ name: 'WiFi', icon: '📶' }, { name: 'Plantation Tour', icon: '🌿' }, { name: 'Forest View', icon: '🌲' }, { name: 'Breakfast Included', icon: '🍳' }],
      houseRules: { checkInTime: '14:00', checkOutTime: '11:00', smokingAllowed: false, petsAllowed: false },
      tags: ['treehouse', 'coorg', 'nature', 'coffee', 'romantic'],
      isFeatured: false, minimumStay: 1, maximumStay: 7,
    },
  ];

  for (const propData of properties) {
    const id = uuidv4();
    await db.collection('properties').doc(id).set({
      id,
      ...propData,
      isAvailable: true,
      isActive: true,
      viewCount: 0,
      rating: { average: 4.5 + Math.random() * 0.4, count: Math.floor(Math.random() * 50) + 5 },
      blockedDates: [],
      revenue: { total: 0, monthly: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Property: ${propData.title}`);
  }

  // ─── Tour Packages ────────────────────────────────────────────────────────
  const packages = [
    {
      agentId: agent.id,
      title: 'Goa Beach Getaway 4D/3N',
      description: 'Experience the best of Goa with this all-inclusive package. Enjoy pristine beaches, vibrant nightlife, and delicious seafood. Curated by Aarya Kulkarni.',
      destination: 'Goa',
      durationDays: 4,
      pricePerPerson: 8500,
      maxPersons: 10,
      includesStay: true,
      includesTransport: true,
      includesActivities: true,
      activities: ['Beach hopping', 'Water sports', 'Sunset cruise', 'Spice plantation tour'],
      itineraryDays: [
        { day: 1, title: 'Arrival & Beach', description: 'Arrive at Goa airport, check-in at beachside cottage, evening at Calangute beach' },
        { day: 2, title: 'North Goa Tour', description: 'Fort Aguada, Anjuna flea market, water sports at Baga beach' },
        { day: 3, title: 'South Goa', description: 'Palolem beach, spice plantation tour, sunset cruise' },
        { day: 4, title: 'Departure', description: 'Morning leisure, checkout, airport transfer' },
      ],
      images: [{ url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800', caption: 'Goa beach' }],
    },
    {
      agentId: agent.id,
      title: 'Rajasthan Heritage Tour 7D/6N',
      description: 'Explore the royal heritage of Rajasthan — palaces, forts, and the golden desert. A journey through time curated by Aarya Kulkarni.',
      destination: 'Rajasthan',
      durationDays: 7,
      pricePerPerson: 18000,
      maxPersons: 15,
      includesStay: true,
      includesTransport: true,
      includesActivities: true,
      activities: ['Camel safari', 'Palace tour', 'Folk dance show', 'Cooking class', 'Desert camping'],
      itineraryDays: [
        { day: 1, title: 'Jaipur Arrival', description: 'Check-in at heritage haveli, Hawa Mahal visit' },
        { day: 2, title: 'Jaipur Sightseeing', description: 'Amber Fort, City Palace, Jantar Mantar' },
        { day: 3, title: 'Jaipur to Jodhpur', description: 'Drive to Jodhpur, Mehrangarh Fort, Blue City walk' },
        { day: 4, title: 'Jodhpur to Jaisalmer', description: 'Golden Fort, camel safari at sunset' },
        { day: 5, title: 'Desert Camp', description: 'Desert camping, folk music and dance evening' },
        { day: 6, title: 'Jaisalmer to Udaipur', description: 'Lake Pichola boat ride, City Palace' },
        { day: 7, title: 'Departure', description: 'Morning leisure, checkout, airport transfer' },
      ],
      images: [{ url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800', caption: 'Rajasthan palace' }],
    },
    {
      agentId: agent.id,
      title: 'Kerala Backwaters & Hills 5D/4N',
      description: 'Discover the serene backwaters of Alleppey and the misty hills of Munnar. A perfect blend of nature and culture.',
      destination: 'Kerala',
      durationDays: 5,
      pricePerPerson: 12000,
      maxPersons: 8,
      includesStay: true,
      includesTransport: true,
      includesActivities: true,
      activities: ['Houseboat cruise', 'Tea plantation tour', 'Ayurvedic spa', 'Kathakali show'],
      itineraryDays: [
        { day: 1, title: 'Kochi Arrival', description: 'Arrive at Kochi, Fort Kochi heritage walk' },
        { day: 2, title: 'Alleppey Backwaters', description: 'Board houseboat, cruise through backwaters' },
        { day: 3, title: 'Munnar Hills', description: 'Drive to Munnar, tea plantation tour' },
        { day: 4, title: 'Munnar Sightseeing', description: 'Eravikulam National Park, Mattupetty Dam' },
        { day: 5, title: 'Departure', description: 'Return to Kochi, airport transfer' },
      ],
      images: [{ url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800', caption: 'Kerala backwaters' }],
    },
  ];

  for (const pkgData of packages) {
    const id = uuidv4();
    await db.collection('packages').doc(id).set({
      id,
      ...pkgData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Package: ${pkgData.title}`);
  }

  console.log('\n✅ Seed completed!\n');
  console.log('Test credentials (all use password: Test@1234):');
  console.log('  Traveler:         arya@travelsuperapp.com');
  console.log('  Travel Agent:     chaitali@travelsuperapp.com');
  console.log('  Property Manager: siddhi@travelsuperapp.com');
  console.log('  Driver:           snehal@travelsuperapp.com');
  console.log('  Travel Agent 2:   aarya@travelsuperapp.com');
  console.log('  Traveler 2:       shruti@travelsuperapp.com');
  console.log('  Admin:            admin@travelsuperapp.com\n');
}

module.exports = { seedData };
