import React from 'react';
import '../../styles/skeleton.css';

/**
 * Skeleton loading card — shown while properties are loading
 * Matches the PropertyCard layout for smooth transition
 */
export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-image" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-subtitle" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-price" />
      </div>
    </div>
  );
}
