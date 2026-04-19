/**
 * Features Demo Page
 * Shows every implemented feature with live status indicators
 * Route: /features
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/features.css';

// ─── Feature registry ─────────────────────────────────────────────────────────
const FEATURE_SECTIONS = [
  {
    title: '🔐 Authentication',
    color: '#6366f1',
    features: [
      { name: 'JWT Login / Register', desc: 'Secure token-based auth with bcrypt password hashing', route: '/login', testable: true },
      { name: 'Role-based Access', desc: 'Traveler, Host, Admin roles enforced on every route', badge: 'RBAC' },
      { name: 'Auto-logout on expiry', desc: 'Token expiry detected, user redirected to login', badge: 'Security' },
      { name: 'Password strength meter', desc: 'Live strength indicator on register page', route: '/register' },
      { name: 'Profile management', desc: 'Update name, phone, language, currency, avatar', route: '/profile', auth: true },
    ],
  },
  {
    title: '🏠 Property Listings',
    color: '#FF385C',
    features: [
      { name: 'Browse all properties', desc: '3 seeded properties: Goa cottage, Udaipur villa, Manali farmhouse', route: '/properties', testable: true },
      { name: 'Search by city', desc: 'Type a city name in the search bar — powered by OpenStreetMap/Photon', route: '/', testable: true },
      { name: 'Filter by type & price', desc: 'Sidebar filters: property type, price range, guest count', route: '/properties' },
      { name: 'Sort results', desc: 'Sort by newest, price low/high, top rated', route: '/properties' },
      { name: 'Property detail page', desc: 'Full gallery, amenities, house rules, OSM map, reviews', route: '/properties' },
      { name: 'Skeleton loaders', desc: 'Shimmer placeholders while data loads', testable: true },
      { name: 'Image gallery', desc: 'Multi-image carousel with thumbnail navigation', route: '/properties' },
      { name: 'Category filter tabs', desc: 'Filter by Entire Home, Villa, Cottage, Farmhouse, Private Room', route: '/' },
    ],
  },
  {
    title: '🗺️ Maps (OpenStreetMap)',
    color: '#22c55e',
    features: [
      { name: 'Interactive Leaflet map', desc: 'Property location shown on OSM tiles — no API key needed', route: '/properties' },
      { name: 'Location autocomplete', desc: 'Photon API suggests cities as you type', route: '/', testable: true },
      { name: 'Geocoding on property create', desc: 'Nominatim converts address → lat/lng when host lists property', badge: 'Backend' },
      { name: 'Custom emoji markers', desc: '🏠 primary marker, 📍 secondary markers with popups', route: '/properties' },
      { name: 'OSM attribution', desc: 'Required attribution shown in map and dropdown', badge: 'Compliance' },
    ],
  },
  {
    title: '📅 Booking System',
    color: '#f59e0b',
    features: [
      { name: 'Date picker with validation', desc: 'Check-in/out dates, min stay enforced, past dates blocked', route: '/properties', auth: true },
      { name: 'Guest capacity check', desc: 'Cannot book more guests than property allows', badge: 'Validation' },
      { name: 'Double-booking prevention', desc: 'Overlapping date check before confirming any booking', badge: 'Backend' },
      { name: 'Live price breakdown', desc: 'Subtotal, 12% GST, cleaning fee calculated in real time', route: '/properties', auth: true },
      { name: 'Booking confirmation page', desc: 'Reference number, dates, amount, notification note', auth: true },
      { name: 'My Bookings dashboard', desc: 'All bookings with status tabs: All / Confirmed / Pending / Cancelled', route: '/my-bookings', auth: true },
      { name: 'Itinerary page', desc: 'Full stay details, host contact, house rules, payment summary, print', route: '/my-bookings', auth: true },
      { name: 'Cancel booking', desc: 'Cancellation with 24hr policy, triggers refund flow', auth: true },
    ],
  },
  {
    title: '💳 Payments (Razorpay)',
    color: '#0ea5e9',
    features: [
      { name: 'Razorpay order creation', desc: 'Backend creates order, returns key + amount to frontend', badge: 'Backend' },
      { name: 'Razorpay checkout modal', desc: 'Native Razorpay UI — card, UPI, netbanking, wallet', auth: true },
      { name: 'HMAC signature verification', desc: 'Payment verified server-side before confirming booking', badge: 'Security' },
      { name: 'Payment record in PostgreSQL', desc: 'Full audit trail: order ID, payment ID, signature, method', badge: 'Database' },
      { name: 'Webhook handler', desc: 'Handles payment.captured and payment.failed events', badge: 'Backend' },
      { name: 'Refund on cancellation', desc: 'Triggers Razorpay refund API via Spring Boot service', badge: 'Microservice' },
    ],
  },
  {
    title: '⚡ Real-time (Socket.io)',
    color: '#8b5cf6',
    features: [
      { name: 'JWT-authenticated sockets', desc: 'Socket connection requires valid JWT token', badge: 'Security' },
      { name: 'Booking status updates', desc: 'Instant push when booking is confirmed or cancelled', badge: 'Live' },
      { name: 'Per-booking chat rooms', desc: 'Traveler ↔ Host messaging in booking-scoped rooms', badge: 'Live' },
      { name: 'Typing indicators', desc: 'Shows "typing..." when other party is composing', badge: 'Live' },
      { name: 'Online presence tracking', desc: 'Server tracks connected users by userId', badge: 'Backend' },
    ],
  },
  {
    title: '📱 Notifications',
    color: '#ec4899',
    features: [
      { name: 'Firebase push notifications', desc: 'Booking confirmed/cancelled push to device', badge: 'FCM' },
      { name: 'Twilio SMS fallback', desc: 'SMS sent to phone number on booking events', badge: 'SMS' },
      { name: 'Toast notifications', desc: 'In-app success/error toasts on every action', testable: true },
    ],
  },
  {
    title: '🤖 AI Features (OpenAI)',
    color: '#14b8a6',
    features: [
      { name: 'Property description generator', desc: 'GPT-3.5 generates SEO-optimized listing descriptions', badge: 'Optional' },
      { name: 'Travel recommendations', desc: 'AI suggests activities, restaurants, tips for destination', badge: 'Optional' },
    ],
  },
  {
    title: '☕ Spring Boot Microservice',
    color: '#84cc16',
    features: [
      { name: 'Payment logging (async)', desc: 'Node.js calls Spring Boot to log payments — non-blocking', badge: 'Java' },
      { name: 'Booking verification REST', desc: 'GET /api/bookings/verify/:id — confirms booking status', badge: 'Java' },
      { name: 'SOAP endpoint', desc: 'verifyBooking SOAP operation with XSD schema + WSDL', badge: 'SOAP' },
      { name: 'JPA + Hibernate', desc: 'Reads same PostgreSQL tables as Node.js via JPA entities', badge: 'Java' },
      { name: 'Spring Security', desc: 'Basic auth for service-to-service calls', badge: 'Security' },
      { name: 'Actuator health check', desc: 'http://localhost:8080/actuator/health', badge: 'Ops' },
    ],
  },
  {
    title: '🗄️ Database',
    color: '#f97316',
    features: [
      { name: 'PostgreSQL — Users', desc: 'UUID PK, bcrypt password, role enum, timestamps', badge: 'PG' },
      { name: 'PostgreSQL — Bookings', desc: 'Date overlap index, status enum, cross-DB property ref', badge: 'PG' },
      { name: 'PostgreSQL — Payments', desc: 'Razorpay IDs, JSONB metadata, refund tracking', badge: 'PG' },
      { name: 'MongoDB — Properties', desc: 'GeoJSON coordinates, text search index, virtual fields', badge: 'Mongo' },
      { name: 'MongoDB — Reviews', desc: 'Post-save hook auto-updates property aggregate ratings', badge: 'Mongo' },
      { name: 'Geospatial queries', desc: '$near operator finds properties within radius km', badge: 'Mongo' },
    ],
  },
  {
    title: '♿ Accessibility',
    color: '#64748b',
    features: [
      { name: 'Semantic HTML', desc: 'header, main, nav, section, article, aside throughout', badge: 'a11y' },
      { name: 'ARIA labels & roles', desc: 'aria-label, aria-live, role=status/alert on dynamic content', badge: 'a11y' },
      { name: 'Keyboard navigation', desc: 'All interactive elements reachable and operable by keyboard', badge: 'a11y' },
      { name: 'Skip to main content', desc: 'Hidden link at top of page for screen reader users', badge: 'a11y' },
      { name: 'Focus indicators', desc: 'Visible :focus-visible outlines on all focusable elements', badge: 'a11y' },
      { name: 'Screen reader text', desc: '.sr-only class for visually hidden but readable content', badge: 'a11y' },
    ],
  },
  {
    title: '🔒 Security',
    color: '#dc2626',
    features: [
      { name: 'Helmet.js headers', desc: 'CSP, HSTS, X-Frame-Options and 10+ security headers', badge: 'Backend' },
      { name: 'Rate limiting', desc: 'Global 200 req/15min, Auth endpoints 20 req/15min', badge: 'Backend' },
      { name: 'Input validation', desc: 'express-validator on all POST/PUT endpoints', badge: 'Backend' },
      { name: 'CORS whitelist', desc: 'Only frontend origin allowed, credentials: true', badge: 'Backend' },
      { name: 'Password excluded by default', desc: 'Sequelize defaultScope excludes password from all queries', badge: 'Backend' },
      { name: 'Environment variables', desc: 'All secrets in .env, never committed to git', badge: 'Ops' },
    ],
  },
];

// ─── API status checker ───────────────────────────────────────────────────────
function useApiStatus() {
  const [status, setStatus] = useState({ backend: 'checking', properties: 'checking' });

  useEffect(() => {
    api.get('/health')
      .then(() => setStatus((s) => ({ ...s, backend: 'online' })))
      .catch(() => setStatus((s) => ({ ...s, backend: 'offline' })));

    api.get('/properties?limit=1')
      .then((r) => setStatus((s) => ({ ...s, properties: r.data.pagination?.total > 0 ? 'seeded' : 'empty' })))
      .catch(() => setStatus((s) => ({ ...s, properties: 'offline' })));
  }, []);

  return status;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Features() {
  const { user } = useAuth();
  const apiStatus = useApiStatus();
  const [expanded, setExpanded] = useState(null);

  const statusColor = { online: '#22c55e', offline: '#ef4444', checking: '#f59e0b', seeded: '#22c55e', empty: '#f59e0b' };
  const statusLabel = { online: '✅ Online', offline: '❌ Offline', checking: '⏳ Checking...', seeded: '✅ Seeded', empty: '⚠️ Empty' };

  return (
    <div className="features-page">
      <div className="container">

        {/* Header */}
        <div className="features-header">
          <h1 className="features-title">✈️ Travel Super App — Feature Overview</h1>
          <p className="features-subtitle">
            Every feature implemented in this project, with live status and direct links to try them.
          </p>
        </div>

        {/* Live status panel */}
        <div className="status-panel">
          <h2 className="status-panel-title">Live System Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-dot" style={{ background: statusColor[apiStatus.backend] }} />
              <span>Node.js Backend (port 5000)</span>
              <span className="status-label" style={{ color: statusColor[apiStatus.backend] }}>
                {statusLabel[apiStatus.backend]}
              </span>
            </div>
            <div className="status-item">
              <span className="status-dot" style={{ background: '#22c55e' }} />
              <span>React Frontend (port 3000)</span>
              <span className="status-label" style={{ color: '#22c55e' }}>✅ Running</span>
            </div>
            <div className="status-item">
              <span className="status-dot" style={{ background: statusColor[apiStatus.properties] }} />
              <span>MongoDB Properties</span>
              <span className="status-label" style={{ color: statusColor[apiStatus.properties] }}>
                {statusLabel[apiStatus.properties]}
              </span>
            </div>
            <div className="status-item">
              <span className="status-dot" style={{ background: user ? '#22c55e' : '#f59e0b' }} />
              <span>Authentication</span>
              <span className="status-label" style={{ color: user ? '#22c55e' : '#f59e0b' }}>
                {user ? `✅ Logged in as ${user.firstName}` : '⚠️ Not logged in'}
              </span>
            </div>
          </div>

          {/* Quick test credentials */}
          <div className="test-credentials">
            <p className="creds-title">🧪 Test Credentials (seeded)</p>
            <div className="creds-grid">
              <div className="cred-item">
                <span className="cred-role">Traveler</span>
                <code>traveler@test.com</code>
                <code>Test@1234</code>
                <Link to="/login" className="btn btn-primary btn-sm">Login now →</Link>
              </div>
              <div className="cred-item">
                <span className="cred-role">Host</span>
                <code>host@test.com</code>
                <code>Test@1234</code>
                <Link to="/login" className="btn btn-outline btn-sm">Login now →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="quick-nav">
          <h2 className="quick-nav-title">Quick Navigation</h2>
          <div className="quick-nav-grid">
            {[
              { label: '🏠 Home', to: '/' },
              { label: '🔍 Browse Properties', to: '/properties' },
              { label: '🔐 Login', to: '/login' },
              { label: '📝 Register', to: '/register' },
              { label: '📅 My Bookings', to: '/my-bookings' },
              { label: '👤 Profile', to: '/profile' },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="quick-nav-btn">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Feature sections */}
        <div className="feature-sections">
          {FEATURE_SECTIONS.map((section, si) => (
            <div key={si} className="feature-section">
              <button
                className="section-toggle"
                onClick={() => setExpanded(expanded === si ? null : si)}
                aria-expanded={expanded === si}
                style={{ borderLeftColor: section.color }}
              >
                <span className="section-title">{section.title}</span>
                <span className="section-count">{section.features.length} features</span>
                <span className="section-chevron" aria-hidden="true">
                  {expanded === si ? '▲' : '▼'}
                </span>
              </button>

              {expanded === si && (
                <div className="feature-list">
                  {section.features.map((f, fi) => (
                    <div key={fi} className="feature-item">
                      <div className="feature-info">
                        <span className="feature-name">{f.name}</span>
                        <span className="feature-desc">{f.desc}</span>
                      </div>
                      <div className="feature-actions">
                        {f.badge && (
                          <span className="feature-badge" style={{ background: `${section.color}20`, color: section.color }}>
                            {f.badge}
                          </span>
                        )}
                        {f.route && (
                          <Link
                            to={f.route}
                            className="feature-link"
                            aria-label={`Try ${f.name}`}
                          >
                            Try it →
                          </Link>
                        )}
                        {f.auth && !user && (
                          <span className="feature-auth-note">🔒 Login required</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* API endpoints reference */}
        <div className="api-reference">
          <h2 className="api-ref-title">📡 API Endpoints Reference</h2>
          <div className="api-table-wrapper">
            <table className="api-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                  <th>Auth</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['POST', '/api/auth/register', 'Create account', '—'],
                  ['POST', '/api/auth/login', 'Login, get JWT', '—'],
                  ['GET', '/api/auth/me', 'Get current user', '✅'],
                  ['GET', '/api/properties', 'List/search properties', '—'],
                  ['GET', '/api/properties/:id', 'Property detail', '—'],
                  ['GET', '/api/properties/suggestions?q=', 'OSM autocomplete', '—'],
                  ['POST', '/api/bookings', 'Create booking', '✅'],
                  ['GET', '/api/bookings (list)', 'My bookings', '✅'],
                  ['GET', '/api/bookings/:id', 'Booking itinerary', '✅'],
                  ['PUT', '/api/bookings/:id/cancel', 'Cancel booking', '✅'],
                  ['POST', '/api/payments/create-order', 'Create Razorpay order', '✅'],
                  ['POST', '/api/payments/verify', 'Verify payment', '✅'],
                  ['POST', '/api/payments/webhook', 'Razorpay webhook', '—'],
                  ['GET', '/api/manager/dashboard', 'Manager dashboard stats', '✅'],
                  ['GET', '/api/manager/properties', 'Manager properties', '✅'],
                  ['GET', '/api/manager/bookings', 'Manager bookings', '✅'],
                  ['PATCH', '/api/manager/bookings/:id/status', 'Accept/reject booking', '✅'],
                  ['POST', '/api/manager/properties/:id/block-dates', 'Block dates', '✅'],
                  ['GET', '/api/reviews/property/:id', 'Property reviews', '—'],
                  ['POST', '/api/reviews', 'Submit review', '✅'],
                  ['GET', '/api/health', 'Health check', '—'],
                ].map(([method, endpoint, desc, auth], index) => (
                  <tr key={`${method}-${index}`}>
                    <td><span className={`method-badge method-${method.toLowerCase()}`}>{method}</span></td>
                    <td><code>{endpoint}</code></td>
                    <td>{desc}</td>
                    <td>{auth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
