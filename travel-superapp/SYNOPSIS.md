# Travel Super App — Project Synopsis

**Project Title:** Travel Super App  
**Technology Stack:** React.js · Node.js · Express · Firebase Firestore (In-Memory) · Razorpay · OpenStreetMap  
**Version:** 2.0  
**Date:** April 2026

---

## 1. Introduction

The Travel Super App is a comprehensive, full-stack web application that unifies the fragmented landscape of online travel services into a single, cohesive platform. Inspired by industry leaders such as MakeMyTrip, Airbnb, and Uber, the system enables travelers to discover, book, and pay for homestay accommodations, transport services, and curated tour packages — all from one interface.

The platform is built on a role-based architecture with five distinct user roles, each with dedicated dashboards, workflows, and API access. Real-time communication via Socket.io ensures that actions from one role are immediately reflected across all connected parties.

---

## 2. Problem Statement

The contemporary travel industry is characterized by significant fragmentation. A traveler seeking to plan a trip must typically navigate multiple independent platforms:

- One platform for property discovery and booking
- Another for transport/ride booking
- A third for curated tour packages
- Separate payment gateways for each

This disjointed experience results in:
- Inefficiency and data inconsistency
- Poor user experience
- No unified itinerary view
- No cross-role communication (e.g., property manager unaware of booking until email)

---

## 3. Scope

The Travel Super App addresses these problems by providing:

1. **Unified booking platform** — stays, transport, and packages in one place
2. **Role-based access control (RBAC)** — 5 distinct roles with appropriate permissions
3. **Real-time cross-role communication** — Socket.io events connect all roles
4. **Integrated payment processing** — Razorpay with HMAC signature verification
5. **Map-based transport visualization** — OpenStreetMap with route display
6. **Distance-based fare calculation** — Haversine formula, no random values
7. **Admin oversight** — System-level management and analytics

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 · React Router v6 · Leaflet Maps · Socket.io      │
│  Role-based dashboards · Razorpay Checkout · Lazy loading    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                               │
│  Node.js · Express · JWT Auth · Socket.io · express-validator│
│  Controllers: Auth, Property, Booking, Transport, Package,   │
│               Payment, Manager, Driver, Agent, Admin         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       DATABASE                               │
│  Firebase Firestore (production) / In-Memory (development)   │
│  Collections: users, properties, bookings, payments,         │
│               transport, packages, packageBookings, reviews  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Workflow

### Traveler Booking Flow
```
1. Traveler searches properties by city/dates/guests
2. Selects property → views details, map, reviews
3. Selects dates → booking created (status: pending)
4. Razorpay payment initiated → HMAC signature verified
5. Booking confirmed → Property Manager notified (Socket.io)
6. Traveler views itinerary with stay + transport details
7. After checkout → traveler submits review
```

### Transport Booking Flow
```
1. Traveler enters pickup/dropoff addresses
2. Backend geocodes via OpenStreetMap (Nominatim)
3. Haversine distance calculated → fare = base + (rate × km)
4. Traveler selects vehicle type → transport booking created
5. Driver sees pending request in dashboard
6. Driver accepts → traveler notified in real-time
7. Driver updates: accepted → in_progress → completed
8. Route displayed on Leaflet map
```

### Package Booking Flow (Cross-Role)
```
1. Travel Agent creates package (stay + transport + activities)
2. Traveler browses and books package
3. If package includes transport → transport request auto-created for drivers
4. Agent confirms/cancels booking from Agent Bookings page
5. Driver accepts transport request linked to package
6. Traveler sees full itinerary
```

---

## 6. Modules

### Module 1: Authentication & RBAC
- JWT-based authentication (7-day tokens)
- 5 roles: Traveler, Property Manager, Travel Agent, Driver, Admin
- Role-based route guards (ProtectedRoute, ManagerRoute, AgentRoute, DriverRoute, AdminRoute)
- bcrypt password hashing (10 rounds)

### Module 2: Property Management
- CRUD operations for property listings
- Geocoding via OpenStreetMap (Nominatim)
- Image upload via Cloudinary
- Date blocking to prevent double-bookings
- Revenue tracking per property

### Module 3: Booking System
- Double-booking prevention (overlap detection)
- Pricing: subtotal + 12% GST + cleaning fee
- Weekly/monthly discount support
- Cancellation with 24-hour policy
- Status lifecycle: pending → confirmed → completed → cancelled

### Module 4: Payment Processing
- Razorpay integration (Node.js SDK)
- HMAC-SHA256 signature verification
- Demo mode fallback for testing
- Payment history page for travelers

### Module 5: Transport System
- Address geocoding (OpenStreetMap)
- Haversine distance calculation
- Fare = base + (rate_per_km × distance)
- Vehicle types: Bike, Auto, Car, SUV, Van, Bus
- Route visualization on Leaflet map
- Driver assignment and status tracking

### Module 6: Tour Packages (Travel Agent)
- Agent creates packages combining stay + transport + activities
- Day-wise itinerary builder
- Package booking triggers transport request for drivers
- Agent confirms/cancels bookings from dedicated page

### Module 7: Real-Time Communication
- Socket.io rooms per user (`user:{userId}`)
- Events: booking:new, booking:confirmed, booking:cancelled, booking:update
- Manager dashboard updates in real-time on new bookings

### Module 8: Admin Panel
- System-wide statistics (users, properties, bookings, revenue)
- User management (activate/deactivate)
- Role breakdown visualization
- Booking status analytics

---

## 7. Database Design

### Collections (Firebase Firestore / In-Memory)

**users**
```
id, firstName, lastName, email, password (hashed), phone, role,
avatar, isVerified, isActive, preferredLanguage, preferredCurrency,
lastLoginAt, createdAt, updatedAt
```

**properties**
```
id, hostId, hostName, title, description, propertyType, maxGuests,
bedrooms, beds, bathrooms, pricePerNight, cleaningFee, securityDeposit,
weeklyDiscount, monthlyDiscount, location{city, state, lat, lng},
images[], amenities[], houseRules{}, minimumStay, maximumStay,
isAvailable, isActive, isFeatured, rating{average, count},
blockedDates[], revenue{total, monthly}, createdAt, updatedAt
```

**bookings**
```
id, userId, propertyId, propertyName, propertyLocation, propertyImage,
checkIn, checkOut, guests, nights, pricePerNight, subtotal, taxes,
cleaningFee, totalAmount, currency, status, specialRequests,
cancellationReason, confirmedAt, cancelledAt, createdAt, updatedAt
```

**payments**
```
id, bookingId, userId, razorpayOrderId, razorpayPaymentId,
razorpaySignature, amount, amountInPaise, currency, status,
method, paidAt, createdAt, updatedAt
```

**transport**
```
id, userId, driverId, bookingId, packageBookingId, vehicleType,
pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat,
dropoffLng, distanceKm, estimatedMinutes, fare, currency, status,
pickupTime, notes, createdAt, updatedAt
```

**packages**
```
id, agentId, title, description, destination, durationDays,
pricePerPerson, maxPersons, includesStay, includesTransport,
includesActivities, activities[], itineraryDays[], images[],
isActive, createdAt, updatedAt
```

**packageBookings**
```
id, userId, packageId, persons, totalAmount, travelDate,
status, specialRequests, createdAt, updatedAt
```

**reviews**
```
id, propertyId, bookingId, userId, userName, userAvatar,
ratings{overall}, comment, isVisible, hostResponse, createdAt, updatedAt
```

---

## 8. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI framework |
| Routing | React Router v6 | Client-side routing |
| State | Context API + useState | Auth & local state |
| Maps | Leaflet + React-Leaflet | Route visualization |
| Real-time | Socket.io Client | Live notifications |
| HTTP | Axios | API calls |
| Dates | date-fns | Date formatting |
| Notifications | react-hot-toast | User feedback |
| Backend | Node.js + Express | REST API server |
| Auth | JWT + bcryptjs | Authentication |
| Validation | express-validator | Input validation |
| Real-time | Socket.io | WebSocket server |
| Database | Firebase Firestore | Cloud database |
| Dev DB | In-Memory Store | Local development |
| Payments | Razorpay | Payment processing |
| Maps API | OpenStreetMap (Nominatim) | Geocoding (free) |
| Images | Cloudinary | Media storage |
| SMS | Twilio | Notifications |

---

## 9. Outcome

The Travel Super App successfully delivers:

✅ **Fully functional 5-role RBAC system** — each role has dedicated UI and API access  
✅ **Real-time cross-role communication** — booking events propagate instantly  
✅ **Razorpay payment integration** — complete flow with HMAC verification  
✅ **Distance-based transport fares** — Haversine formula, zero randomness  
✅ **Map route visualization** — Leaflet maps in driver dashboard  
✅ **Package → Transport cross-role event** — package booking auto-creates transport request  
✅ **Admin oversight panel** — system analytics and user management  
✅ **Zero external DB dependency** — in-memory store for instant local development  

---

## 10. Future Scope

1. **Firebase Auth integration** — replace JWT with Firebase Authentication
2. **Push notifications** — Firebase Cloud Messaging for mobile
3. **Advanced analytics** — revenue charts, occupancy rates, demand forecasting
4. **Multi-language support** — i18n for Hindi, Tamil, Telugu, Marathi
5. **AI-powered recommendations** — OpenAI integration for personalized suggestions
6. **Cancellation refunds** — automated Razorpay refund processing
7. **Review moderation** — admin approval workflow for reviews
8. **Driver GPS tracking** — real-time location updates during trips
9. **Package payment** — Razorpay integration for package bookings
10. **Mobile app** — React Native version

---

## 11. Conclusion

The Travel Super App demonstrates a production-ready, full-stack travel platform with proper role-based architecture, real-time communication, and integrated payment processing. The system's modular design allows for easy extension, while the in-memory database layer ensures zero-friction local development without any external dependencies.

The platform successfully connects all five roles — Traveler, Property Manager, Travel Agent, Driver, and Admin — through event-driven workflows that mirror real-world travel booking scenarios.

---

## Test Credentials (Password: `Test@1234`)

| Role | Email |
|------|-------|
| Traveler | arya@travelsuperapp.com |
| Travel Agent | chaitali@travelsuperapp.com |
| Property Manager | siddhi@travelsuperapp.com |
| Driver | snehal@travelsuperapp.com |
| Travel Agent 2 | aarya@travelsuperapp.com |
| Traveler 2 | shruti@travelsuperapp.com |
| Admin | admin@travelsuperapp.com |

---

## Run Instructions

```bash
# Backend
cd travel-superapp/backend
npm install
node server.js
# → http://localhost:5000

# Frontend
cd travel-superapp/frontend
npm install
npm start
# → http://localhost:3000
```
