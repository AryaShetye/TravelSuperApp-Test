import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AttractionCard from './AttractionCard';
import './AttractionCard.css';

/**
 * Reusable section that fetches and displays attractions for a location.
 * Used in: PropertyDetail, PackageDetail, city search results
 */
export default function AttractionsSection({ location, lat, lng, title = 'Top Attractions Nearby' }) {
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!location && !lat) return;
    fetchAttractions();
  }, [location, lat, lng]);

  async function fetchAttractions() {
    setLoading(true);
    try {
      const params = {};
      if (location) params.location = location;
      if (lat) params.lat = lat;
      if (lng) params.lng = lng;

      const res = await api.get('/attractions', { params });
      setAttractions(res.data.attractions || []);
      setSource(res.data.source || '');
    } catch {
      setAttractions([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="attractions-section">
        <h2 className="attractions-title">{title}</h2>
        <div className="attractions-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="attraction-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (attractions.length === 0) return null;

  const displayed = showAll ? attractions : attractions.slice(0, 4);

  return (
    <section className="attractions-section" aria-labelledby="attractions-heading">
      <div className="attractions-header">
        <h2 id="attractions-heading" className="attractions-title">{title}</h2>
        <div className="attractions-meta">
          {source === 'serpapi' && (
            <span className="source-badge tripadvisor">
              <img
                src="https://static.tacdn.com/img2/brand_refresh/Tripadvisor_lockup_horizontal_secondary_registered.svg"
                alt="TripAdvisor"
                style={{ height: '14px', verticalAlign: 'middle' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
              />
              <span style={{ display: 'none' }}>TripAdvisor</span>
            </span>
          )}
          {source === 'openstreetmap' && (
            <span className="source-badge osm">📍 OpenStreetMap</span>
          )}
        </div>
      </div>

      <div className="attractions-grid">
        {displayed.map((attraction) => (
          <AttractionCard key={attraction.id} attraction={attraction} />
        ))}
      </div>

      {attractions.length > 4 && (
        <button
          className="attractions-show-more"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Show less ↑' : `View all ${attractions.length} attractions ↓`}
        </button>
      )}
    </section>
  );
}
