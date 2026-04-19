import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import '../../styles/property-card.css';

export default function PropertyCard({ property }) {
  const [imageError, setImageError] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const images = property.images || [];
  const primaryImage = images[currentImage]?.url;

  const priceFormatted = property.pricePerNight?.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <article className="property-card">
      <Link
        to={`/properties/${property._id || property.id}`}
        className="property-card-link"
        aria-label={`View ${property.title} in ${property.location?.city}`}
      >
        {/* Image */}
        <div className="property-card-image-wrapper">
          {!imageError && primaryImage ? (
            <img
              src={primaryImage}
              alt={`${property.title} — exterior view`}
              className="property-card-image"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="property-card-image-fallback" aria-hidden="true">
              🏠
            </div>
          )}

          {/* Image navigation dots */}
          {images.length > 1 && (
            <div className="image-dots" aria-hidden="true">
              {images.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  className={`image-dot ${currentImage === i ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentImage(i);
                  }}
                  tabIndex={-1}
                />
              ))}
            </div>
          )}

          {/* Property type badge */}
          <div className="property-type-badge" aria-label={`Property type: ${property.propertyType}`}>
            {property.propertyType?.replace('_', ' ')}
          </div>
        </div>

        {/* Info */}
        <div className="property-card-info">
          <div className="property-card-header">
            <h3 className="property-card-title">{property.title}</h3>
            <StarRating rating={property.rating?.average} compact />
          </div>

          <p className="property-card-location">
            📍 {property.location?.city}, {property.location?.state}
          </p>

          <div className="property-card-details">
            <span>{property.maxGuests} guests</span>
            <span aria-hidden="true">·</span>
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
            <span aria-hidden="true">·</span>
            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          </div>

          <div className="property-card-price">
            <span className="price-amount">{priceFormatted}</span>
            <span className="price-unit"> / night</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
