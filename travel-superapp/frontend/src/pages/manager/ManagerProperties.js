import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/manager-dashboard.css';

const PROPERTY_TYPE_LABELS = {
  entire_home: 'Entire Home',
  private_room: 'Private Room',
  shared_room: 'Shared Room',
  villa: 'Villa',
  cottage: 'Cottage',
  farmhouse: 'Farmhouse',
};

export default function ManagerProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      const res = await api.get('/manager/properties');
      setProperties(res.data.data.properties);
    } catch {
      toast.error('Could not load properties');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(property) {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;

    setDeletingId(property._id);
    try {
      await api.delete(`/properties/${property._id}`);
      toast.success('Property removed');
      setProperties((prev) => prev.filter((p) => p._id !== property._id));
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="manager-page">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 className="manager-page-title">My Properties</h1>
            <p className="manager-page-subtitle">{properties.length} listing{properties.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/manager/properties/new" className="btn btn-primary">+ Add Property</Link>
        </div>

        {properties.length === 0 ? (
          <div className="manager-empty">
            <div className="manager-empty__icon" aria-hidden="true">🏠</div>
            <h2 className="manager-empty__title">No properties yet</h2>
            <p className="manager-empty__text">Add your first property to start receiving bookings.</p>
            <Link to="/manager/properties/new" className="btn btn-primary">Add property</Link>
          </div>
        ) : (
          <div className="manager-property-grid">
            {properties.map((property) => (
              <article key={property._id} className="manager-property-card">
                <div className="manager-property-card__image">
                  {property.images?.[0]?.url ? (
                    <img src={property.images[0].url} alt={property.title} loading="lazy" />
                  ) : (
                    <div className="manager-property-card__image-placeholder" aria-hidden="true">🏠</div>
                  )}
                </div>

                <div className="manager-property-card__body">
                  <h3 className="manager-property-card__title">{property.title}</h3>
                  <p className="manager-property-card__meta">
                    {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                    {' · '}
                    {property.location?.city}, {property.location?.state}
                  </p>
                  <p className="manager-property-card__price">
                    ₹{Number(property.pricePerNight).toLocaleString('en-IN')}
                    <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}> / night</span>
                  </p>

                  <div className="manager-property-card__actions">
                    <Link
                      to={`/manager/properties/${property._id}/edit`}
                      className="btn btn-outline btn-sm"
                      aria-label={`Edit ${property.title}`}
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(property)}
                      disabled={deletingId === property._id}
                      aria-label={`Delete ${property.title}`}
                      aria-busy={deletingId === property._id}
                    >
                      {deletingId === property._id ? 'Deleting...' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
