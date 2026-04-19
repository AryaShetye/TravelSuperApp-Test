import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addDays, format } from 'date-fns';
import api from '../../services/api';
import '../../styles/search-bar.css';

export default function SearchBar({ onSearch, initialValues = {}, compact = false }) {
  const [location, setLocation] = useState(initialValues.city || '');
  const [checkIn, setCheckIn] = useState(
    initialValues.checkIn ? new Date(initialValues.checkIn) : null
  );
  const [checkOut, setCheckOut] = useState(
    initialValues.checkOut ? new Date(initialValues.checkOut) : null
  );
  const [guests, setGuests] = useState(initialValues.guests || 1);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch OSM/Photon autocomplete suggestions with debounce
  useEffect(() => {
    if (location.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await api.get('/properties/suggestions', { params: { q: location } });
        const results = res.data.suggestions || [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350); // slightly longer debounce — Photon is external

    return () => clearTimeout(debounceRef.current);
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = {};
    if (location.trim()) params.city = location.trim();
    if (checkIn) params.checkIn = format(checkIn, 'yyyy-MM-dd');
    if (checkOut) params.checkOut = format(checkOut, 'yyyy-MM-dd');
    if (guests > 1) params.guests = guests;
    onSearch(params);
    setShowSuggestions(false);
  }

  function selectSuggestion(suggestion) {
    // Use the city name from OSM data (first part of description)
    const cityName = suggestion.city || suggestion.description.split(',')[0];
    setLocation(cityName);
    setShowSuggestions(false);
  }

  return (
    <form
      className={`search-bar ${compact ? 'search-bar--compact' : ''}`}
      onSubmit={handleSearch}
      role="search"
      aria-label="Search for homestays"
    >
      {/* Location — powered by OpenStreetMap/Photon */}
      <div className="search-field search-field--location" ref={suggestionRef}>
        <label htmlFor="search-location" className="search-label">Where</label>
        <input
          id="search-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search destinations"
          className="search-input"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="location-suggestions"
          aria-haspopup="listbox"
        />

        {/* OSM autocomplete dropdown */}
        {showSuggestions && (
          <ul
            id="location-suggestions"
            className="suggestions-dropdown"
            role="listbox"
            aria-label="Location suggestions"
          >
            {loadingSuggestions ? (
              <li className="suggestion-loading" role="option" aria-selected="false">
                <span className="suggestion-spinner" aria-hidden="true" /> Searching...
              </li>
            ) : (
              suggestions.map((s, i) => (
                <li
                  key={i}
                  className="suggestion-item"
                  role="option"
                  aria-selected="false"
                  onClick={() => selectSuggestion(s)}
                  onKeyDown={(e) => e.key === 'Enter' && selectSuggestion(s)}
                  tabIndex={0}
                >
                  <span className="suggestion-pin" aria-hidden="true">📍</span>
                  <span className="suggestion-text">
                    <span className="suggestion-city">{s.city || s.description.split(',')[0]}</span>
                    {s.state && (
                      <span className="suggestion-state">, {s.state}</span>
                    )}
                  </span>
                </li>
              ))
            )}
            <li className="suggestion-attribution" aria-hidden="true">
              © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
            </li>
          </ul>
        )}
      </div>

      {/* Check-in */}
      <div className="search-field">
        <label htmlFor="search-checkin" className="search-label">Check in</label>
        <DatePicker
          id="search-checkin"
          selected={checkIn}
          onChange={(date) => {
            setCheckIn(date);
            if (checkOut && date >= checkOut) setCheckOut(addDays(date, 1));
          }}
          minDate={new Date()}
          placeholderText="Add dates"
          className="search-input"
          dateFormat="dd/MM/yyyy"
          aria-label="Check-in date"
        />
      </div>

      {/* Check-out */}
      <div className="search-field">
        <label htmlFor="search-checkout" className="search-label">Check out</label>
        <DatePicker
          id="search-checkout"
          selected={checkOut}
          onChange={setCheckOut}
          minDate={checkIn ? addDays(checkIn, 1) : addDays(new Date(), 1)}
          placeholderText="Add dates"
          className="search-input"
          dateFormat="dd/MM/yyyy"
          aria-label="Check-out date"
        />
      </div>

      {/* Guests */}
      <div className="search-field">
        <label htmlFor="search-guests" className="search-label">Guests</label>
        <select
          id="search-guests"
          value={guests}
          onChange={(e) => setGuests(parseInt(e.target.value))}
          className="search-input"
          aria-label="Number of guests"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} guest{n !== 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>

      {/* Search button */}
      <button type="submit" className="search-btn" aria-label="Search for homestays">
        <span aria-hidden="true">🔍</span>
        {!compact && <span>Search</span>}
      </button>
    </form>
  );
}
