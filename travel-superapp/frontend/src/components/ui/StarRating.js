import React from 'react';

export default function StarRating({ rating = 0, count, compact = false }) {
  const rounded = Math.round(rating * 2) / 2; // round to nearest 0.5

  return (
    <div
      className="star-rating"
      aria-label={`Rating: ${rating} out of 5${count ? `, ${count} reviews` : ''}`}
    >
      <span className="star-icon" aria-hidden="true">★</span>
      <span className="star-value">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
      {!compact && count > 0 && (
        <span className="star-count">({count})</span>
      )}
    </div>
  );
}
