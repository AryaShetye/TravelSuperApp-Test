# Travel Super App — Installation & Run Guide

## Quick Start (No Database Setup Required)

The backend uses an **in-memory database by default** (`USE_MEMORY_DB=true`).  
This means you can run the full app without installing PostgreSQL, MongoDB, or Firebase.

---

## Prerequisites

- Node.js v18+ 
- npm v9+

---

## 1. Backend

```bash
cd travel-superapp/backend
npm install
node server.js
```

The server starts on **http://localhost:5000**  
Seed data is loaded automatically on first startup.

**Health check:** http://localhost:5000/api/health

---

## 2. Frontend

```bash
cd travel-superapp/frontend
npm install
npm start
```

Opens at **http://localhost:3000**

---

## Test Credentials (password: `Test@1234`)

| Role             | Email                          |
|------------------|-------------------------------|
| Traveler         | arya@travelsuperapp.com       |
| Host             | chaitali@travelsuperapp.com   |
| Property Manager | siddhi@travelsuperapp.com     |
| Driver           | snehal@travelsuperapp.com     |
| Agent            | aarya@travelsuperapp.com      |
| Traveler 2       | shruti@travelsuperapp.com     |

---

## Using Real Firebase (Optional)

1. Create a Firebase project at https://console.firebase.google.com
2. Go to Project Settings → Service Accounts → Generate new private key
3. Update `travel-superapp/backend/.env`:
   ```
   USE_MEMORY_DB=false
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="..."
   ```

---

## Architecture

```
Frontend (React)  →  Backend (Express)  →  In-Memory DB / Firebase Firestore
     :3000               :5000
```

- **Auth:** JWT tokens (7-day expiry)
- **Maps:** OpenStreetMap / Nominatim (free, no API key)
- **Payments:** Razorpay (test mode)
- **Transport fares:** Distance-based (Haversine formula × rate per km)
- **Real-time:** Socket.io

---

## 5 Roles

| Role             | Capabilities                                    |
|------------------|-------------------------------------------------|
| Traveler         | Browse/book stays, book transport, view packages |
| Host             | List properties, manage bookings, view revenue  |
| Property Manager | Same as Host                                    |
| Driver           | Accept/manage transport requests                |
| Agent            | Create/sell tour packages                       |
