import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/not-found.css';

export default function NotFound() {
  return (
    <div className="not-found-page" role="main">
      <div className="not-found-content">
        <div className="not-found-icon" aria-hidden="true">✈️</div>
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page not found</h2>
        <p className="not-found-message">
          Looks like this page took a wrong turn. Let's get you back on track.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">Go home</Link>
          <Link to="/properties" className="btn btn-outline">Browse stays</Link>
        </div>
      </div>
    </div>
  );
}
