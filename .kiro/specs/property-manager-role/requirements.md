# Requirements Document

## Introduction

This document specifies the requirements for implementing the **Property Manager** role in the Travel Super App. The Property Manager role maps to the existing `host` enum value in the PostgreSQL `users` table — no schema migration is required. The feature delivers a complete, production-quality host experience: property listing management, booking lifecycle control, availability calendar, earnings dashboard, and real-time notifications. All additions must integrate cleanly into the existing Node.js/Express backend, React frontend, dual-database architecture (PostgreSQL + MongoDB), and third-party services (Cloudinary, Razorpay, Socket.io) without breaking the traveler flow.

---

## Glossary

- **Property_Manager**: A user whose `role` field equals `host` in the PostgreSQL `users` table. Referred to in the UI as "Property Manager".
- **Traveler**: A user whose `role` field equals `traveler`. Uses the existing booking and browsing flow.
- **Admin**: A user whose `role` field equals `admin`. Retains full platform access.
- **Dashboard**: The Property Manager's private web interface at `/manager/dashboard`.
- **Property**: A MongoDB document in the `properties` collection representing a homestay listing.
- **Booking**: A PostgreSQL record in the `bookings` table representing a reservation made by a Traveler.
- **Availability_Block**: A date range stored on a Property document during which the property cannot be booked.
- **Auth_Service**: The backend authentication subsystem handling JWT issuance and validation (`auth.controller.js`, `auth.middleware.js`).
- **Property_Service**: The backend subsystem handling property CRUD (`property.controller.js`, `property.routes.js`).
- **Booking_Service**: The backend subsystem handling booking lifecycle (`booking.controller.js`, `booking.routes.js`).
- **Manager_Dashboard_Service**: The new backend subsystem (`manager.controller.js`, `manager.routes.js`) introduced by this feature.
- **Cloudinary_Service**: The existing image upload service (`cloudinary.service.js`).
- **Socket_Service**: The existing real-time notification service (`socket.service.js`).
- **Notification_Service**: The existing multi-channel notification service (`notification.service.js`).
- **JWT**: JSON Web Token used for stateless authentication.
- **RBAC**: Role-Based Access Control enforced by the `authorize` middleware.

---

## Requirements

### Requirement 1: Property Manager Registration and Authentication

**User Story:** As a new user, I want to register as a Property Manager and log in to a dedicated dashboard, so that I can start listing and managing my properties.

#### Acceptance Criteria

1. WHEN a registration request is submitted with `role` equal to `"host"`, THE Auth_Service SHALL create a user record with `role = 'host'` in the `users` table.
2. WHEN a login request succeeds for a user with `role = 'host'`, THE Auth_Service SHALL include `role: "host"` in the JWT payload.
3. WHEN the frontend receives a login response with `role = "host"`, THE Frontend SHALL redirect the user to `/manager/dashboard` instead of `/`.
4. WHEN a registration form is rendered, THE Frontend SHALL display a role selector with options `"Traveler"` and `"Property Manager"`.
5. IF a registration request is submitted with a `role` value other than `"traveler"` or `"host"`, THEN THE Auth_Service SHALL reject the request with HTTP 400 and an error message.
6. WHILE a user is authenticated with `role = 'host'`, THE Frontend SHALL render the Property Manager navigation links (Dashboard, My Properties, Bookings, Availability) in the Navbar.
7. WHILE a user is authenticated with `role = 'traveler'`, THE Frontend SHALL NOT render Property Manager navigation links.

---

### Requirement 2: Property Listing Management

**User Story:** As a Property Manager, I want to create, edit, and delete my property listings with images, pricing, location, and amenities, so that travelers can discover and book my properties.

#### Acceptance Criteria

1. WHEN a Property Manager submits a valid property creation request to `POST /api/properties`, THE Property_Service SHALL create a Property document in MongoDB with `hostId` set to the authenticated user's UUID.
2. WHEN a property creation request includes image files, THE Property_Service SHALL upload each image to Cloudinary via the Cloudinary_Service and store the returned `url` and `publicId` in the `images` array.
3. IF a property creation request contains zero image files, THEN THE Property_Service SHALL reject the request with HTTP 400 and the message `"At least one property image is required"`.
4. WHEN a Property Manager submits a valid property update request to `PUT /api/properties/:id`, THE Property_Service SHALL update only the fields present in the request body on the matching Property document.
5. IF a property update or delete request is made by a user whose `id` does not match the Property's `hostId` and whose `role` is not `"admin"`, THEN THE Property_Service SHALL reject the request with HTTP 403.
6. WHEN a Property Manager submits a delete request to `DELETE /api/properties/:id` for a property they own, THE Property_Service SHALL set `isActive = false` on the Property document (soft delete) and schedule deletion of associated Cloudinary images.
7. THE Property_Service SHALL accept the following fields on creation and update: `title` (10–100 chars), `description` (50–2000 chars), `propertyType` (one of `entire_home`, `private_room`, `shared_room`, `villa`, `cottage`, `farmhouse`), `pricePerNight` (minimum ₹100), `maxGuests` (1–50), `bedrooms`, `beds`, `bathrooms`, `cleaningFee`, `securityDeposit`, `weeklyDiscount` (0–50%), `monthlyDiscount` (0–50%), `amenities`, `houseRules`, `minimumStay`, `maximumStay`, `instantBook`.
8. WHEN a property creation request includes an address, THE Property_Service SHALL geocode the address using the Maps_Service and store the resulting GeoJSON coordinates in `location.coordinates`.
9. WHEN a Property Manager requests `GET /api/manager/properties`, THE Manager_Dashboard_Service SHALL return only the Property documents where `hostId` equals the authenticated user's UUID.

---

### Requirement 3: Booking Management

**User Story:** As a Property Manager, I want to view all bookings for my properties and accept or reject pending booking requests, so that I can control who stays at my properties.

#### Acceptance Criteria

1. WHEN a Property Manager requests `GET /api/manager/bookings`, THE Manager_Dashboard_Service SHALL return all Booking records whose `propertyId` matches any Property owned by the authenticated Property Manager.
2. WHEN the booking list response is returned, THE Manager_Dashboard_Service SHALL include `guestName`, `guestEmail`, `propertyName`, `checkIn`, `checkOut`, `guests`, `totalAmount`, and `status` for each Booking.
3. WHEN a Property Manager submits `PATCH /api/manager/bookings/:id/status` with `status = "confirmed"` for a Booking in `pending` state, THE Manager_Dashboard_Service SHALL update the Booking's `status` to `"confirmed"` and set `confirmedAt` to the current timestamp.
4. WHEN a Property Manager submits `PATCH /api/manager/bookings/:id/status` with `status = "cancelled"` for a Booking in `pending` or `confirmed` state, THE Manager_Dashboard_Service SHALL update the Booking's `status` to `"cancelled"`, set `cancelledAt` to the current timestamp, and store the provided `cancellationReason`.
5. IF a booking status update request targets a Booking whose `propertyId` does not belong to the authenticated Property Manager, THEN THE Manager_Dashboard_Service SHALL reject the request with HTTP 403.
6. IF a booking status update request targets a Booking in `completed`, `cancelled`, or `refunded` state, THEN THE Manager_Dashboard_Service SHALL reject the request with HTTP 400 and a descriptive error message.
7. WHEN a Booking status changes to `"confirmed"` or `"cancelled"`, THE Socket_Service SHALL emit a real-time notification to the Traveler's socket room.
8. WHEN a Booking status changes to `"confirmed"` or `"cancelled"`, THE Notification_Service SHALL send a notification to the Traveler via the configured channel (email/push).
9. WHEN a Property Manager requests `GET /api/manager/bookings` with query parameter `status`, THE Manager_Dashboard_Service SHALL filter the returned Booking records to only those matching the specified status value.
10. WHEN a Property Manager requests `GET /api/manager/bookings` with query parameters `page` and `limit`, THE Manager_Dashboard_Service SHALL return a paginated response with `total`, `page`, `limit`, and `pages` fields.

---

### Requirement 4: Property Manager Dashboard

**User Story:** As a Property Manager, I want a dashboard overview showing my total properties, active bookings, and earnings summary, so that I can monitor my business at a glance.

#### Acceptance Criteria

1. WHEN a Property Manager requests `GET /api/manager/dashboard`, THE Manager_Dashboard_Service SHALL return `totalProperties`, `activeBookings`, `completedBookings`, `totalEarnings`, and `monthlyEarnings` computed from the authenticated manager's data.
2. WHEN `totalProperties` is computed, THE Manager_Dashboard_Service SHALL count all Property documents where `hostId` equals the authenticated user's UUID and `isActive` equals `true`.
3. WHEN `activeBookings` is computed, THE Manager_Dashboard_Service SHALL count all Booking records for the manager's properties with `status` in `['pending', 'confirmed']`.
4. WHEN `totalEarnings` is computed, THE Manager_Dashboard_Service SHALL sum the `totalAmount` of all Booking records for the manager's properties with `status = 'completed'`.
5. WHEN `monthlyEarnings` is computed, THE Manager_Dashboard_Service SHALL sum the `totalAmount` of Booking records for the manager's properties with `status = 'completed'` and `confirmedAt` within the current calendar month.
6. WHEN the Dashboard page is rendered in the frontend, THE Frontend SHALL display summary cards for total properties, active bookings, total earnings, and monthly earnings.
7. WHEN the Dashboard page is rendered, THE Frontend SHALL display a recent bookings table showing the 5 most recent Booking records for the manager's properties ordered by `createdAt` descending.
8. IF the authenticated user's `role` is not `"host"` or `"admin"`, THEN THE Frontend SHALL redirect the user away from `/manager/dashboard` to `/`.

---

### Requirement 5: Availability Management

**User Story:** As a Property Manager, I want to block and unblock specific date ranges on my properties, so that I can prevent bookings during periods when the property is unavailable.

#### Acceptance Criteria

1. THE Property document SHALL store an `blockedDates` array, where each element contains `startDate` (Date), `endDate` (Date), and `reason` (String, optional).
2. WHEN a Property Manager submits `POST /api/manager/properties/:id/block-dates` with a valid `startDate` and `endDate`, THE Manager_Dashboard_Service SHALL append a new entry to the Property's `blockedDates` array.
3. IF the submitted `startDate` is not before `endDate`, THEN THE Manager_Dashboard_Service SHALL reject the request with HTTP 400 and the message `"startDate must be before endDate"`.
4. IF the submitted date range overlaps with an existing `confirmed` Booking for the same property, THEN THE Manager_Dashboard_Service SHALL reject the request with HTTP 409 and a message listing the conflicting booking dates.
5. WHEN a Property Manager submits `DELETE /api/manager/properties/:id/block-dates/:blockId`, THE Manager_Dashboard_Service SHALL remove the matching entry from the Property's `blockedDates` array.
6. IF a block-dates or unblock-dates request targets a Property whose `hostId` does not match the authenticated user's UUID, THEN THE Manager_Dashboard_Service SHALL reject the request with HTTP 403.
7. WHEN a Traveler requests `GET /api/properties/:id`, THE Property_Service SHALL include the `blockedDates` array in the response so the frontend booking calendar can disable those dates.
8. WHEN the Booking_Service processes a new booking creation request, THE Booking_Service SHALL check whether any date in the requested `checkIn`–`checkOut` range falls within a `blockedDates` entry on the target Property, and IF a conflict exists, THEN THE Booking_Service SHALL reject the request with HTTP 409 and the message `"Selected dates are blocked by the property manager"`.

---

### Requirement 6: Access Control and Security

**User Story:** As a platform operator, I want strict role-based access control so that Property Managers can only modify their own data and Travelers cannot access manager-only endpoints.

#### Acceptance Criteria

1. THE Auth_Service SHALL include the `role` claim in every issued JWT so that downstream middleware can enforce RBAC without a database lookup per request.
2. WHEN a request arrives at any `/api/manager/*` route, THE Auth_Service SHALL verify the JWT and THE RBAC middleware SHALL confirm the user's `role` is `"host"` or `"admin"`, rejecting all other requests with HTTP 403.
3. IF a request to modify or delete a Property or Booking is made by a Property Manager whose `id` does not match the resource's owner identifier, THEN THE Manager_Dashboard_Service SHALL reject the request with HTTP 403 and the message `"Not authorized to modify this resource"`.
4. WHEN a Traveler navigates to any `/manager/*` frontend route, THE Frontend SHALL redirect the Traveler to `/` without rendering any manager UI.
5. THE Manager_Dashboard_Service SHALL NOT expose any Booking or Property data belonging to other Property Managers in any response.
6. WHEN a Property Manager account is deactivated (`isActive = false`), THE Auth_Service SHALL reject subsequent JWT-authenticated requests from that account with HTTP 403.

---

### Requirement 7: Image Upload for Properties

**User Story:** As a Property Manager, I want to upload multiple high-quality images for each property, so that travelers can visually evaluate the listing before booking.

#### Acceptance Criteria

1. WHEN a property creation or update request includes image files, THE Property_Service SHALL pass each file through the existing `upload.middleware.js` (Multer) before invoking the Cloudinary_Service.
2. THE Property_Service SHALL accept a maximum of 10 image files per request.
3. WHEN images are uploaded to Cloudinary, THE Cloudinary_Service SHALL store each image under the folder path `travel-superapp/properties/{hostId}` and return `url` and `publicId` for each uploaded file.
4. WHEN a Property is soft-deleted, THE Property_Service SHALL invoke `deleteImage(publicId)` from the Cloudinary_Service for each image in the Property's `images` array.
5. IF an image upload to Cloudinary fails, THEN THE Property_Service SHALL reject the entire property creation or update request with HTTP 500 and the message `"Image upload failed. Please try again."`.
6. THE Property_Service SHALL mark the first uploaded image as `isPrimary = true` when no existing primary image is present on the Property document.

---

### Requirement 8: Real-Time Notifications for Booking Events

**User Story:** As a Property Manager, I want to receive real-time notifications when a Traveler books one of my properties, so that I can respond promptly.

#### Acceptance Criteria

1. WHEN a Traveler successfully creates a Booking for a Property Manager's property, THE Socket_Service SHALL emit a `booking:new` event to the Property Manager's socket room containing `bookingId`, `propertyName`, `guestName`, `checkIn`, `checkOut`, and `totalAmount`.
2. WHEN a Traveler cancels a Booking, THE Socket_Service SHALL emit a `booking:cancelled` event to the Property Manager's socket room containing `bookingId` and `propertyName`.
3. WHEN the Property Manager Dashboard page is active in the browser, THE Frontend SHALL listen for `booking:new` and `booking:cancelled` socket events and update the dashboard summary counts without requiring a page reload.
4. WHEN a `booking:new` event is received by the frontend, THE Frontend SHALL display a toast notification with the message `"New booking received for {propertyName}"`.
5. THE Socket_Service SHALL use the authenticated user's UUID as the socket room identifier, consistent with the existing `notifyBookingUpdate` pattern in `socket.service.js`.

---

### Requirement 9: Frontend Property Manager Pages

**User Story:** As a Property Manager, I want dedicated frontend pages for managing my properties, bookings, and availability, so that I have a complete self-service interface.

#### Acceptance Criteria

1. THE Frontend SHALL provide the following new lazy-loaded page components: `ManagerDashboard`, `ManagerProperties`, `ManagerPropertyForm`, `ManagerBookings`, and `ManagerAvailability`.
2. WHEN the `ManagerPropertyForm` page is rendered in create mode, THE Frontend SHALL display input fields for all required and optional property fields defined in Requirement 2, Criterion 7.
3. WHEN the `ManagerPropertyForm` page is rendered in edit mode, THE Frontend SHALL pre-populate all fields with the existing Property data fetched from `GET /api/properties/:id`.
4. WHEN the `ManagerProperties` page is rendered, THE Frontend SHALL display a list of the authenticated manager's properties fetched from `GET /api/manager/properties`, each with Edit and Delete action buttons.
5. WHEN the Delete button is clicked on a property card, THE Frontend SHALL display a confirmation dialog before submitting the delete request.
6. WHEN the `ManagerBookings` page is rendered, THE Frontend SHALL display a table of bookings with columns for guest name, property, dates, amount, status, and action buttons for Accept and Reject on `pending` bookings.
7. WHEN the `ManagerAvailability` page is rendered, THE Frontend SHALL display a calendar view for each property showing existing bookings and blocked date ranges.
8. WHEN a Property Manager adds a blocked date range via the `ManagerAvailability` page, THE Frontend SHALL submit the range to `POST /api/manager/properties/:id/block-dates` and refresh the calendar on success.
9. ALL new manager pages SHALL be wrapped in a `ManagerRoute` guard component that redirects unauthenticated users to `/login` and non-host users to `/`.
10. THE Frontend SHALL add the following routes to `App.js`: `/manager/dashboard`, `/manager/properties`, `/manager/properties/new`, `/manager/properties/:id/edit`, `/manager/bookings`, and `/manager/availability`.
