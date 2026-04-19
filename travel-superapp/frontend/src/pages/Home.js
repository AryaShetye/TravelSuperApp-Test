import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import PropertyCard from '../components/property/PropertyCard';
import SearchBar from '../components/search/SearchBar';
import SkeletonCard from '../components/ui/SkeletonCard';
import '../styles/home.css';

const CATEGORIES = [
  { id: 'entire_home', label: 'Entire Home', icon: '🏠' },
  { id: 'villa', label: 'Villa', icon: '🏡' },
  { id: 'cottage', label: 'Cottage', icon: '🛖' },
  { id: 'farmhouse', label: 'Farmhouse', icon: '🌾' },
  { id: 'private_room', label: 'Private Room', icon: '🛏️' },
];

// Role-based hero content
const ROLE_HERO = {
  traveler: {
    title: 'Find your perfect stay',
    subtitle: 'Discover unique homestays, book transport, and explore curated packages across India.',
    cta: null,
  },
  property_manager: {
    title: 'Manage your properties',
    subtitle: 'Track bookings, manage availability, and grow your revenue.',
    cta: { label: '+ Add Property', href: '/manager/properties/new' },
  },
  agent: {
    title: 'Create amazing packages',
    subtitle: 'Bundle stays, transport, and activities into curated tour packages for travelers.',
    cta: { label: '+ Create Package', href: '/agent/packages/new' },
  },
  driver: {
    title: 'Ready to drive?',
    subtitle: 'Accept transport requests, manage your trips, and earn on your schedule.',
    cta: { label: 'View Requests', href: '/driver/requests' },
  },
  admin: {
    title: 'Platform Overview',
    subtitle: 'Monitor users, properties, bookings, and system health.',
    cta: { label: 'Admin Dashboard', href: '/admin/dashboard' },
  },
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const roleHero = user ? (ROLE_HERO[user.role] || ROLE_HERO.traveler) : ROLE_HERO.traveler;
  const isTraveler = !user || user.role === 'traveler';

  useEffect(() => {
    fetchFeatured();
    fetchTrending();
  }, [activeCategory]);

  async function fetchFeatured() {
    setLoading(true);
    try {
      const params = { limit: 8, sortBy: 'rating.average', sortOrder: 'desc' };
      if (activeCategory) params.propertyType = activeCategory;
      const res = await api.get('/api/properties', { params });
      setFeaturedProperties(res.data.properties);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrending() {
    setTrendingLoading(true);
    try {
      // Uses SerpAPI Travel Explore with curated fallback
      const res = await api.get('/api/explore');
      setTrendingDestinations(res.data.destinations || []);
    } catch {
      // non-critical
    } finally {
      setTrendingLoading(false);
    }
  }

  function handleSearch(searchParams) {
    const query = new URLSearchParams(searchParams).toString();
    navigate(`/properties?${query}`);
  }

  function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in your browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      navigate(`/properties?city=${encodeURIComponent(transcript)}`);
    };
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div className="home-page">
      {/* Hero Section — role-aware */}
      <section className="hero" aria-label="Search for homestays">
        <div className="hero-content">
          <h1 className="hero-title">
            {roleHero.title.split(' ').slice(0, -1).join(' ')}<br />
            <span className="hero-highlight">{roleHero.title.split(' ').slice(-1)[0]}</span>
          </h1>
          <p className="hero-subtitle">{roleHero.subtitle}</p>

          {/* Show search only for travelers */}
          {isTraveler && (
            <>
              <SearchBar onSearch={handleSearch} />
              <button
                className={`voice-search-btn ${listening ? 'listening' : ''}`}
                onClick={startVoiceSearch}
                aria-label="Voice search"
                title="Search by voice"
              >
                {listening ? '🔴 Listening...' : '🎤 Voice Search'}
              </button>
            </>
          )}

          {/* Role-specific CTA */}
          {roleHero.cta && (
            <Link to={roleHero.cta.href} className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              {roleHero.cta.label}
            </Link>
          )}
        </div>
        <div className="hero-image" aria-hidden="true">
          <div className="hero-image-overlay" />
        </div>
      </section>

      {/* Trending Destinations — from real API */}
      <section className="trending-section" aria-label="Trending destinations">
        <div className="container">
          <h2 className="section-title">🔥 Trending Destinations</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Popular travel spots across India — real data from OpenStreetMap
          </p>
          {trendingLoading ? (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ minWidth: '160px', height: '120px', background: '#f0f0f0', borderRadius: '12px', flexShrink: 0 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {trendingDestinations.map((dest) => (
                <button
                  key={dest.name}
                  className="trending-card"
                  onClick={() => navigate(`/properties?city=${encodeURIComponent(dest.name)}`)}
                  aria-label={`Explore ${dest.name}`}
                >
                  <span className="trending-emoji">{dest.emoji}</span>
                  <span className="trending-name">{dest.name}</span>
                  <span className="trending-tag">{dest.tag}</span>
                  {dest.propertyCount > 0 && (
                    <span className="trending-count">{dest.propertyCount} stay{dest.propertyCount !== 1 ? 's' : ''}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category Filter — only for travelers */}
      {isTraveler && (
        <section className="categories-section" aria-label="Property categories">
          <div className="container">
            <div className="categories-scroll" role="tablist" aria-label="Filter by property type">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? '' : cat.id)}
                >
                  <span className="category-icon" aria-hidden="true">{cat.icon}</span>
                  <span className="category-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Properties */}
      <section className="featured-section" aria-label="Featured properties">
        <div className="container">
          <h2 className="section-title">
            {activeCategory
              ? `${CATEGORIES.find((c) => c.id === activeCategory)?.label}s`
              : 'Featured stays'}
          </h2>

          {loading ? (
            <div className="properties-grid" aria-busy="true" aria-label="Loading properties">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : featuredProperties.length > 0 ? (
            <div className="properties-grid">
              {featuredProperties.map((property) => (
                <PropertyCard key={property._id || property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <span className="empty-icon" aria-hidden="true">🏠</span>
              <p>No properties found. Check back soon!</p>
            </div>
          )}

          {!loading && featuredProperties.length > 0 && (
            <div className="section-cta">
              <button className="btn btn-outline" onClick={() => navigate('/properties')}>
                View all properties
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How It Works — only for travelers/guests */}
      {isTraveler && (
        <section className="how-it-works" aria-label="How it works">
          <div className="container">
            <h2 className="section-title">How it works</h2>
            <div className="steps-grid">
              {[
                { step: '1', icon: '🔍', title: 'Search', desc: 'Find homestays by location, dates, and guests' },
                { step: '2', icon: '🏠', title: 'Choose', desc: 'Browse photos, amenities, and reviews' },
                { step: '3', icon: '💳', title: 'Book & Pay', desc: 'Secure payment via Razorpay' },
                { step: '4', icon: '✈️', title: 'Travel', desc: 'Check in and enjoy your stay' },
              ].map((item) => (
                <div key={item.step} className="step-card">
                  <div className="step-number" aria-hidden="true">{item.step}</div>
                  <div className="step-icon" aria-hidden="true">{item.icon}</div>
                  <h3 className="step-title">{item.title}</h3>
                  <p className="step-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services Banner */}
      <section className="services-banner" aria-label="Our services">
        <div className="container">
          <h2 className="section-title">Everything you need to travel</h2>
          <div className="services-grid">
            <Link to="/properties" className="service-card">
              <span className="service-icon">🏠</span>
              <h3>Stays</h3>
              <p>Homestays, villas, cottages and more</p>
            </Link>
            <Link to="/transport" className="service-card">
              <span className="service-icon">🚗</span>
              <h3>Transport</h3>
              <p>Book rides from bikes to buses</p>
            </Link>
            <Link to="/packages" className="service-card">
              <span className="service-icon">🧳</span>
              <h3>Tour Packages</h3>
              <p>Curated trips by expert agents</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
