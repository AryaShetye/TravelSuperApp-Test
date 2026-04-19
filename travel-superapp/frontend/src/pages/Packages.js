import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SkeletonCard from '../components/ui/SkeletonCard';
import '../styles/packages.css';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => { fetchPackages(); }, [search]);

  async function fetchPackages() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.destination = search;
      const res = await api.get('/packages', { params });
      setPackages(res.data.packages);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="packages-page">
      <div className="packages-hero">
        <div className="container">
          <h1>Tour Packages</h1>
          <p>Curated travel experiences by expert agents</p>
          <form onSubmit={handleSearch} className="packages-search">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by destination..."
              className="form-input"
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="packages-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <span>🧳</span>
            <p>No packages found{search ? ` for "${search}"` : ''}.</p>
            {search && <button className="btn btn-outline" onClick={() => { setSearch(''); setSearchInput(''); }}>Clear search</button>}
          </div>
        ) : (
          <div className="packages-grid">
            {packages.map(pkg => (
              <Link key={pkg.id} to={`/packages/${pkg.id}`} className="package-card-link">
                <div className="package-card">
                  <div className="package-card-image">
                    {pkg.images?.[0] ? (
                      <img src={pkg.images[0].url || pkg.images[0]} alt={pkg.title} />
                    ) : (
                      <div className="package-card-placeholder">🧳</div>
                    )}
                    <div className="package-card-duration">{pkg.durationDays}D / {pkg.durationDays - 1}N</div>
                  </div>
                  <div className="package-card-body">
                    <h3>{pkg.title}</h3>
                    <p className="package-card-dest">📍 {pkg.destination}</p>
                    <div className="package-card-tags">
                      {pkg.includesStay && <span className="tag">🏠 Stay</span>}
                      {pkg.includesTransport && <span className="tag">🚗 Transport</span>}
                      {pkg.includesActivities && <span className="tag">🎯 Activities</span>}
                    </div>
                    <div className="package-card-footer">
                      <div className="package-card-price">
                        <span className="price-label">From</span>
                        <span className="price-value">₹{parseFloat(pkg.pricePerPerson).toLocaleString('en-IN')}</span>
                        <span className="price-per">/ person</span>
                      </div>
                      {pkg.agent && (
                        <span className="package-agent">by {pkg.agent.firstName} {pkg.agent.lastName}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
