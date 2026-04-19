import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PropertyCard from '../components/property/PropertyCard';
import SearchBar from '../components/search/SearchBar';
import PropertyFilters from '../components/property/PropertyFilters';
import SkeletonCard from '../components/ui/SkeletonCard';
import Pagination from '../components/ui/Pagination';
import '../styles/properties.css';

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('');
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: searchParams.get('guests') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    propertyType: searchParams.get('propertyType') || '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
  });

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== null)
      );

      // ── Use /api/hotels (SerpAPI with fallback) when city is specified ──
      // ── Use /api/properties for local/manager-owned listings ────────────
      let res;
      if (filters.city) {
        // Try SerpAPI hotels first
        res = await api.get('/hotels', {
          params: {
            location: filters.city,
            checkIn: filters.checkIn || undefined,
            checkOut: filters.checkOut || undefined,
            guests: filters.guests || 2,
            page: filters.page,
            limit: 12,
          },
        });
        // Normalize SerpAPI response to match PropertyCard expectations
        const hotels = (res.data.hotels || []).map(normalizeHotel);
        setProperties(hotels);
        setPagination(res.data.pagination || { total: hotels.length, page: 1, pages: 1 });
        setDataSource(res.data.source || 'api');
      } else {
        // No city filter — show local DB properties
        res = await api.get('/properties', { params });
        setProperties(res.data.properties || []);
        setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
        setDataSource('local');
      }
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  function handleSearch(searchData) {
    setFilters((prev) => ({ ...prev, ...searchData, page: 1 }));
    setSearchParams(searchData);
  }

  function handleFilterChange(newFilters) {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }

  function handlePageChange(page) {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="properties-page">
      {/* Search bar */}
      <div className="properties-search-bar">
        <div className="container">
          <SearchBar initialValues={filters} onSearch={handleSearch} compact />
        </div>
      </div>

      <div className="container">
        <div className="properties-layout">
          {/* Filters sidebar */}
          <aside className="filters-sidebar" aria-label="Property filters">
            <PropertyFilters filters={filters} onChange={handleFilterChange} />
          </aside>

          {/* Results */}
          <main id="main-content" className="properties-results">
            {/* Results header */}
            <div className="results-header">
              <h1 className="results-title">
                {loading ? (
                  <span className="skeleton-text" aria-hidden="true" />
                ) : (
                  <>
                    {pagination.total > 0
                      ? `${pagination.total} stay${pagination.total !== 1 ? 's' : ''}`
                      : 'No stays found'}
                    {filters.city && ` in ${filters.city}`}
                  </>
                )}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Data source badge */}
                {!loading && dataSource && (
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: dataSource === 'serpapi' ? '#22c55e15' : '#6366f115',
                    color: dataSource === 'serpapi' ? '#16a34a' : '#4f46e5',
                    fontWeight: 600,
                  }}>
                    {dataSource === 'serpapi' ? '🔴 Live Data' : dataSource === 'local' ? '💾 Local' : '📦 Cached'}
                  </span>
                )}

                <div className="sort-controls">
                  <label htmlFor="sort-select" className="sort-label">Sort by:</label>
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      handleFilterChange({ sortBy, sortOrder });
                    }}
                  >
                    <option value="createdAt-desc">Newest first</option>
                    <option value="pricePerNight-asc">Price: Low to High</option>
                    <option value="pricePerNight-desc">Price: High to Low</option>
                    <option value="rating.average-desc">Top rated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Property grid */}
            {loading ? (
              <div className="properties-grid" aria-busy="true">
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : properties.length > 0 ? (
              <>
                <div className="properties-grid">
                  {properties.map((property) => (
                    <PropertyCard key={property._id || property.id} property={property} />
                  ))}
                </div>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <div className="empty-state" role="status">
                <span className="empty-icon" aria-hidden="true">🔍</span>
                <h2>No properties found</h2>
                <p>Try adjusting your search filters or exploring a different location.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => handleFilterChange({ city: '', minPrice: '', maxPrice: '', propertyType: '' })}
                >
                  Clear filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Normalize SerpAPI hotel to match PropertyCard schema ─────────────────────
function normalizeHotel(hotel) {
  return {
    id: hotel.id,
    _id: hotel.id,
    title: hotel.title || hotel.name,
    description: hotel.description || '',
    propertyType: hotel.propertyType || 'hotel',
    location: hotel.location || { city: '', state: '', formattedAddress: '' },
    pricePerNight: hotel.pricePerNight || 0,
    currency: hotel.currency || 'INR',
    rating: hotel.rating || { average: 0, count: 0 },
    images: hotel.images?.length > 0 ? hotel.images : [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800' }],
    amenities: hotel.amenities || [],
    maxGuests: hotel.maxGuests || 2,
    bedrooms: hotel.bedrooms || 1,
    bathrooms: hotel.bathrooms || 1,
    beds: hotel.beds || 1,
    isAvailable: true,
    isActive: true,
    source: hotel.source || 'api',
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
  };
}
