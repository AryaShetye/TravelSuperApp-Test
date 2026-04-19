import React from 'react';
import '../../styles/filters.css';

const PROPERTY_TYPES = [
  { value: '', label: 'All types' },
  { value: 'entire_home', label: 'Entire home' },
  { value: 'private_room', label: 'Private room' },
  { value: 'villa', label: 'Villa' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'farmhouse', label: 'Farmhouse' },
];

export default function PropertyFilters({ filters, onChange }) {
  function handleChange(field, value) {
    onChange({ [field]: value });
  }

  function handleReset() {
    onChange({
      minPrice: '',
      maxPrice: '',
      propertyType: '',
    });
  }

  return (
    <div className="filters-panel" aria-label="Search filters">
      <div className="filters-header">
        <h2 className="filters-title">Filters</h2>
        <button
          className="filters-reset"
          onClick={handleReset}
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      </div>

      {/* Property type */}
      <fieldset className="filter-group">
        <legend className="filter-label">Property type</legend>
        <div className="filter-options">
          {PROPERTY_TYPES.map((type) => (
            <label key={type.value} className="filter-option">
              <input
                type="radio"
                name="propertyType"
                value={type.value}
                checked={filters.propertyType === type.value}
                onChange={() => handleChange('propertyType', type.value)}
                className="filter-radio"
              />
              <span className="filter-option-label">{type.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Price range */}
      <fieldset className="filter-group">
        <legend className="filter-label">Price per night (₹)</legend>
        <div className="price-range">
          <div className="price-input-group">
            <label htmlFor="min-price" className="sr-only">Minimum price</label>
            <input
              id="min-price"
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => handleChange('minPrice', e.target.value)}
              className="price-input"
              min="0"
              aria-label="Minimum price per night in rupees"
            />
          </div>
          <span className="price-separator" aria-hidden="true">—</span>
          <div className="price-input-group">
            <label htmlFor="max-price" className="sr-only">Maximum price</label>
            <input
              id="max-price"
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => handleChange('maxPrice', e.target.value)}
              className="price-input"
              min="0"
              aria-label="Maximum price per night in rupees"
            />
          </div>
        </div>
      </fieldset>

      {/* Guests */}
      <fieldset className="filter-group">
        <legend className="filter-label">Guests</legend>
        <select
          value={filters.guests || ''}
          onChange={(e) => handleChange('guests', e.target.value)}
          className="filter-select"
          aria-label="Number of guests"
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
            <option key={n} value={n}>{n}+ guests</option>
          ))}
        </select>
      </fieldset>
    </div>
  );
}
