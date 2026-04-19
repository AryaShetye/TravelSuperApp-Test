import React from 'react';
import './AttractionCard.css';

const TYPE_ICONS = {
  attraction: '🏛️', museum: '🏛️', viewpoint: '🌄', artwork: '🎨',
  restaurant: '🍽️', cafe: '☕', bar: '🍺', park: '🌳', beach: '🏖️',
  gallery: '🖼️', theme_park: '🎡', place: '📍', hotel: '🏨',
};

function StarRatingDisplay({ rating, count }) {
  if (!rating || rating === 0) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="attraction-rating" aria-label={`Rating: ${rating} out of 5`}>
      <span className="stars">
        {'★'.repeat(full)}
        {half ? '½' : ''}
        {'☆'.repeat(empty)}
      </span>
      <span className="rating-value">{rating.toFixed(1)}</span>
      {count > 0 && <span className="rating-count">({count.toLocaleString()})</span>}
    </div>
  );
}

export default function AttractionCard({ attraction, compact = false }) {
  const icon = TYPE_ICONS[attraction.type?.toLowerCase()] || '📍';

  if (compact) {
    return (
      <div className="attraction-card attraction-card--compact">
        <div className="attraction-card__icon">{icon}</div>
        <div className="attraction-card__body">
          <p className="attraction-card__name">{attraction.name}</p>
          <StarRatingDisplay rating={attraction.rating} count={attraction.reviewCount} />
        </div>
      </div>
    );
  }

  return (
    <article className="attraction-card">
      {attraction.image ? (
        <div className="attraction-card__image-wrapper">
          <img
            src={attraction.image}
            alt={attraction.name}
            className="attraction-card__image"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="attraction-card__image-fallback" style={{ display: 'none' }}>
            <span>{icon}</span>
          </div>
        </div>
      ) : (
        <div className="attraction-card__image-fallback">
          <span>{icon}</span>
        </div>
      )}

      <div className="attraction-card__body">
        <div className="attraction-card__header">
          <h3 className="attraction-card__name">{attraction.name}</h3>
          <span className="attraction-card__type">{attraction.type}</span>
        </div>

        <StarRatingDisplay rating={attraction.rating} count={attraction.reviewCount} />

        {attraction.description && (
          <p className="attraction-card__desc">{attraction.description.slice(0, 100)}{attraction.description.length > 100 ? '…' : ''}</p>
        )}

        <div className="attraction-card__footer">
          {attraction.location && (
            <span className="attraction-card__location">📍 {attraction.location}</span>
          )}
          {attraction.price && attraction.price !== 'Free' && (
            <span className="attraction-card__price">{attraction.price}</span>
          )}
          {attraction.url && (
            <a
              href={attraction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="attraction-card__link"
              aria-label={`View ${attraction.name} on TripAdvisor`}
            >
              View more →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
