# Implementation Plan: Property Manager Role

## Overview

Implement the full Property Manager (host) experience on top of the existing platform. The plan follows a strict dependency order: MongoDB schema first, then backend controller/routes, then server wiring, then frontend guard and pages, then tests. All new code extends existing patterns — no new infrastructure required.

## Tasks

- [x] 1. Add `blockedDates` subdocument array to the MongoDB Property model
  - In `backend/models/Property.js`, define a `blockedDateSchema` with `startDate` (Date, required), `endDate` (Date, required), and `reason` (String, default `''`), with `{ _id: true }` so each entry gets a unique ObjectId for deletion
  - Add `blockedDates: { type: [blockedDateSchema], default: [] }` to `propertySchema`
  - _Requirements: 5.1_

- [x] 2. Create `backend/controllers/manager.controller.js`
  - [x] 2.1 Implement `getDashboard`
    - Fetch all active properties for `req.user.id` from MongoDB (`hostId` + `isActive: true`)
    - Query PostgreSQL `Booking` for counts and sums: `totalProperties`, `activeBookings` (pending+confirmed), `completedBookings`, `totalEarnings` (sum of completed), `monthlyEarnings` (sum of completed with `confirmedAt` in current calendar month)
    - Include `recentBookings`: 5 most recent bookings ordered by `createdAt DESC`, enriched with `propertyName` from the property list
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.2 Implement `getManagerProperties`
    - Query MongoDB for all Property documents where `hostId === req.user.id`
    - Return `{ data: { properties, total } }`
    - _Requirements: 2.9_

  - [x] 2.3 Implement `getManagerBookings`
    - Fetch manager's property IDs from MongoDB, then query PostgreSQL `Booking` with those IDs
    - Support `status` filter query param and `page`/`limit` pagination
    - Join with `User` (PostgreSQL) to include `guestName` and `guestEmail` in each row
    - Return `{ data: { bookings, pagination: { total, page, limit, pages } } }`
    - _Requirements: 3.1, 3.2, 3.9, 3.10_

  - [x] 2.4 Implement `updateBookingStatus` with `updateBookingStatusValidation`
    - Fetch booking by `req.params.id`; verify its `propertyId` belongs to the manager (403 if not)
    - Reject terminal states (`completed`, `cancelled`, `refunded`) with HTTP 400
    - On `confirmed`: set `status = 'confirmed'`, `confirmedAt = new Date()`
    - On `cancelled`: set `status = 'cancelled'`, `cancelledAt = new Date()`, store `cancellationReason`
    - After update: call `notifyBookingUpdate(booking.userId, ...)` and `sendBookingConfirmation` / `sendBookingCancellation` from `notification.service.js`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 2.5 Implement `blockDates` with `blockDatesValidation`
    - Fetch property by `req.params.id`; verify `hostId === req.user.id` (403 if not)
    - Validate `startDate < endDate` (400 if not)
    - Query PostgreSQL for any `confirmed` booking on that property overlapping the range; reject with 409 if found, including `conflictDates`
    - Push new entry to `property.blockedDates` via `$push` and save
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [x] 2.6 Implement `unblockDates`
    - Fetch property; verify ownership (403 if not owner)
    - Use `$pull` on `blockedDates` by `_id: req.params.blockId`; return 404 if block not found
    - _Requirements: 5.5, 5.6_

- [x] 3. Create `backend/routes/manager.routes.js`
  - Apply `authenticate` then `authorize('host', 'admin')` at the router level (not per-route)
  - Wire all six routes to the controller functions with their validation arrays and `validate` middleware
  - _Requirements: 6.1, 6.2_

- [x] 4. Mount manager routes and harden auth in `backend/server.js` and `auth.controller.js`
  - [x] 4.1 Mount manager routes in `backend/server.js`
    - Add `const managerRoutes = require('./routes/manager.routes')` import
    - Add `app.use('/api/manager', managerRoutes)` after the existing route mounts
    - _Requirements: 6.2_

  - [x] 4.2 Harden role validation in `backend/controllers/auth.controller.js` `register`
    - Add an explicit check: if `role` is provided and not in `['traveler', 'host']`, return HTTP 400 with a descriptive error message
    - _Requirements: 1.1, 1.5_

- [x] 5. Modify `backend/controllers/booking.controller.js` — `createBooking`
  - After the existing double-booking check, add a `blockedDates` overlap check: iterate `property.blockedDates` and test if `checkIn < block.endDate && checkOut > block.startDate`; if any match, return HTTP 409 with `"Selected dates are blocked by the property manager"`
  - After `Booking.create(...)`, fetch the traveler `User` record and emit `booking:new` to `user:${property.hostId}` via `getIO()` with `{ bookingId, propertyName, guestName, checkIn, checkOut, totalAmount }`
  - _Requirements: 5.8, 8.1_

- [x] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create `frontend/src/components/manager/ManagerRoute.js`
  - Read `user` and `loading` from `useAuth()`
  - While loading: render `<LoadingSpinner fullPage />`
  - If no user: `<Navigate to="/login" replace />`
  - If `user.role !== 'host' && user.role !== 'admin'`: `<Navigate to="/" replace />`
  - Otherwise: render `children`
  - _Requirements: 4.8, 6.4, 9.9_

- [x] 8. Create `frontend/src/styles/manager-dashboard.css`
  - Define styles for `.manager-layout`, `.manager-sidebar`, `.manager-content`, `.stats-grid`, `.stat-card`, `.stat-card__value`, `.stat-card__label`, `.manager-table`, `.manager-table th/td`, `.booking-status` badge variants (`pending`, `confirmed`, `cancelled`, `completed`), `.manager-form`, `.image-upload-zone`, `.calendar-grid`, `.blocked-range`, `.btn-accept`, `.btn-reject`
  - Use the existing CSS custom properties from `global.css` (e.g. `--primary`, `--gray-*`, `--radius-*`)
  - _Requirements: 9.1_

- [x] 9. Create `frontend/src/pages/manager/ManagerDashboard.js`
  - On mount, `GET /api/manager/dashboard` and store stats in state
  - Render four stat cards: Total Properties, Active Bookings, Total Earnings, Monthly Earnings
  - Render a recent bookings table (5 rows): guest name, property, dates, amount, status
  - Register socket listeners for `booking:new` (increment `activeBookings`, show toast `"New booking received for {propertyName}"`) and `booking:cancelled` (decrement `activeBookings`); clean up on unmount
  - _Requirements: 4.6, 4.7, 8.3, 8.4_

- [x] 10. Create `frontend/src/pages/manager/ManagerProperties.js`
  - On mount, `GET /api/manager/properties` and render a property list
  - Each card shows title, type, price, status and has Edit (links to `/manager/properties/:id/edit`) and Delete buttons
  - Delete button shows a confirmation dialog (`window.confirm` or inline modal); on confirm, calls `DELETE /api/properties/:id` and refreshes the list
  - _Requirements: 9.4, 9.5_

- [x] 11. Create `frontend/src/pages/manager/ManagerPropertyForm.js`
  - Detect create vs edit mode from the route (`/manager/properties/new` vs `/manager/properties/:id/edit`)
  - In edit mode, `GET /api/properties/:id` on mount and pre-populate all fields
  - Render controlled inputs for all fields from Requirement 2.7: title, description, propertyType (select), pricePerNight, maxGuests, bedrooms, beds, bathrooms, cleaningFee, securityDeposit, weeklyDiscount, monthlyDiscount, amenities (checkbox grid), houseRules fields, minimumStay, maximumStay, instantBook (toggle)
  - Image upload section: file input accepting up to 10 images; preview thumbnails; on submit, use `FormData` with `multipart/form-data`
  - On create: `POST /api/properties`; on edit: `PUT /api/properties/:id`; on success redirect to `/manager/properties`
  - _Requirements: 9.2, 9.3_

- [x] 12. Create `frontend/src/pages/manager/ManagerBookings.js`
  - On mount, `GET /api/manager/bookings` (with `page`, `limit`, optional `status` filter)
  - Render a table with columns: Guest Name, Property, Check-in, Check-out, Amount, Status, Actions
  - For `pending` bookings, show Accept and Reject buttons that call `PATCH /api/manager/bookings/:id/status`
  - Reject action prompts for a `cancellationReason` before submitting
  - Render `<Pagination>` component (reuse existing) and a status filter dropdown
  - _Requirements: 9.6_

- [x] 13. Create `frontend/src/pages/manager/ManagerAvailability.js`
  - On mount, `GET /api/manager/properties` to populate a property selector dropdown
  - When a property is selected, display a calendar grid showing existing bookings (from `GET /api/manager/bookings?propertyId=...`) and blocked date ranges from the property's `blockedDates` array
  - Render a BlockDateForm with `startDate`, `endDate`, and optional `reason` inputs; on submit, `POST /api/manager/properties/:id/block-dates` and refresh the calendar
  - Each blocked range shows a remove button that calls `DELETE /api/manager/properties/:id/block-dates/:blockId`
  - _Requirements: 9.7, 9.8_

- [x] 14. Modify `frontend/src/App.js` — add ManagerRoute and manager page routes
  - Import `ManagerRoute` from `./components/manager/ManagerRoute`
  - Lazy-import all five manager pages: `ManagerDashboard`, `ManagerProperties`, `ManagerPropertyForm`, `ManagerBookings`, `ManagerAvailability`
  - Add six routes inside `<ManagerRoute>`: `/manager/dashboard`, `/manager/properties`, `/manager/properties/new`, `/manager/properties/:id/edit`, `/manager/bookings`, `/manager/availability`
  - _Requirements: 9.10_

- [x] 15. Modify `frontend/src/components/layout/Navbar.js` — add manager nav links
  - In the desktop nav, when `user?.role === 'host'`, render four `<NavLink>` items: Dashboard (`/manager/dashboard`), My Properties (`/manager/properties`), Bookings (`/manager/bookings`), Availability (`/manager/availability`)
  - Mirror the same links in the mobile menu section for authenticated host users
  - _Requirements: 1.6, 1.7_

- [x] 16. Modify `frontend/src/pages/Register.js` — update role selector
  - Change the `<option value="host">` label from `"List my property (Host)"` to `"List my property (Property Manager)"`
  - _Requirements: 1.4_

- [x] 17. Modify `frontend/src/context/AuthContext.js` — redirect host on login
  - After a successful login, if `user.role === 'host'`, navigate to `/manager/dashboard` instead of `/`
  - _Requirements: 1.3_

- [x] 18. Checkpoint — Ensure all frontend pages render and navigate correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Create `backend/tests/manager.property.test.js` — property-based tests
  - Install `fast-check` as a dev dependency if not already present (`npm install --save-dev fast-check`)
  - Configure each test with `{ numRuns: 100 }` and tag with `// Feature: property-manager-role, Property {N}: {property_text}`

  - [ ]* 19.1 Write property test for Property 1: JWT always carries the correct role claim
    - Generator: arbitrary user objects with `role` in `['traveler', 'host', 'admin']`
    - Assert: decoded JWT from `generateToken(user)` has `role === user.role`
    - **Property 1: JWT always carries the correct role claim**
    - **Validates: Requirements 1.2, 6.1**

  - [ ]* 19.2 Write property test for Property 3: Invalid registration roles are rejected
    - Generator: arbitrary strings filtered to exclude `"traveler"` and `"host"`
    - Assert: `POST /api/auth/register` with that role returns HTTP 400
    - **Property 3: Invalid registration roles are rejected**
    - **Validates: Requirements 1.5**

  - [ ]* 19.3 Write property test for Property 4: Property creation sets hostId to the authenticated user
    - Generator: arbitrary valid property payloads with a random host UUID
    - Assert: created Property document has `hostId === req.user.id`
    - **Property 4: Property creation sets hostId to the authenticated user**
    - **Validates: Requirements 2.1**

  - [ ]* 19.4 Write property test for Property 5: Image upload stores url and publicId for every file
    - Generator: arbitrary arrays of 1–10 mock file objects with `originalname`, `buffer`, `mimetype`
    - Assert: resulting `images` array length equals input length, each entry has non-empty `url` and `publicId`, first entry has `isPrimary = true`
    - **Property 5: Image upload stores url and publicId for every file**
    - **Validates: Requirements 2.2, 7.6**

  - [ ]* 19.5 Write property test for Property 6: Non-owner managers cannot modify resources they do not own
    - Generator: arbitrary pairs of user IDs where `requesterId !== ownerId`
    - Assert: controller returns HTTP 403 for property update, booking status update, block-dates, and unblock-dates
    - **Property 6: Non-owner managers cannot modify resources they do not own**
    - **Validates: Requirements 2.5, 3.5, 5.6, 6.3**

  - [ ]* 19.6 Write property test for Property 7: Manager endpoints return only the authenticated manager's data
    - Generator: arbitrary sets of two managers each with distinct properties and bookings
    - Assert: each manager's `/api/manager/properties` and `/api/manager/bookings` responses contain only their own data
    - **Property 7: Manager endpoints return only the authenticated manager's data**
    - **Validates: Requirements 2.9, 3.1, 6.5**

  - [ ]* 19.7 Write property test for Property 8: Booking status transitions respect the state machine
    - Generator: arbitrary bookings in each of the five statuses (`pending`, `confirmed`, `completed`, `cancelled`, `refunded`)
    - Assert: terminal states (`completed`, `cancelled`, `refunded`) return HTTP 400; non-terminal states update correctly and set the corresponding timestamp
    - **Property 8: Booking status transitions respect the state machine**
    - **Validates: Requirements 3.3, 3.4, 3.6**

  - [ ]* 19.8 Write property test for Property 10: Dashboard stats are computed correctly from live data
    - Generator: arbitrary arrays of properties (active/inactive) and bookings (various statuses, various `confirmedAt` dates)
    - Assert: `getDashboard` response satisfies all four stat formulas exactly
    - **Property 10: Dashboard stats are computed correctly from live data**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 19.9 Write property test for Property 11: Blocked dates are appended and removable
    - Generator: arbitrary valid date ranges (startDate < endDate)
    - Assert: after `blockDates`, the range appears in `property.blockedDates`; after `unblockDates` with its `_id`, it is removed and all other entries remain unchanged
    - **Property 11: Blocked dates are appended and removable**
    - **Validates: Requirements 5.2, 5.5**

  - [ ]* 19.10 Write property test for Property 12: Blocked dates prevent new bookings
    - Generator: arbitrary blocked date ranges on a property + overlapping booking requests
    - Assert: `createBooking` returns HTTP 409 with `"Selected dates are blocked by the property manager"` for any overlap
    - **Property 12: Blocked dates prevent new bookings**
    - **Validates: Requirements 5.8**

  - [ ]* 19.11 Write property test for Property 13: Blocked date ranges cannot overlap confirmed bookings
    - Generator: arbitrary confirmed bookings + overlapping block-date requests for the same property
    - Assert: `blockDates` returns HTTP 409 for any overlap with a confirmed booking
    - **Property 13: Blocked date ranges cannot overlap confirmed bookings**
    - **Validates: Requirements 5.4**

  - [ ]* 19.12 Write property test for Property 14: Manager routes reject non-host/non-admin users
    - Generator: arbitrary users with roles in `['traveler']` plus unauthenticated requests
    - Assert: every `/api/manager/*` endpoint returns HTTP 403 before the controller executes
    - **Property 14: Manager routes reject non-host/non-admin users**
    - **Validates: Requirements 6.2**

  - [ ]* 19.13 Write property test for Property 15: booking:new is emitted to the property manager on every new booking
    - Generator: arbitrary valid booking creation payloads for properties with known `hostId`
    - Assert: after `createBooking`, the socket mock receives `booking:new` on room `user:{property.hostId}` with all required fields
    - **Property 15: booking:new is emitted to the property manager on every new booking**
    - **Validates: Requirements 8.1**

- [x] 20. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- The design uses JavaScript (Node.js + React) throughout — no language selection needed
- Do NOT recreate any existing backend or frontend files; only extend/modify as specified
