import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Travel Super App — Home">
              <span aria-hidden="true">✈️</span> TravelApp
            </Link>
            <p className="footer-tagline">
              Discover unique homestays across India
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation — Explore">
            <h3 className="footer-heading">Explore</h3>
            <ul className="footer-links">
              <li><Link to="/properties">All stays</Link></li>
              <li><Link to="/properties?propertyType=villa">Villas</Link></li>
              <li><Link to="/properties?propertyType=cottage">Cottages</Link></li>
              <li><Link to="/properties?propertyType=farmhouse">Farmhouses</Link></li>
            </ul>
          </nav>

          <nav aria-label="Footer navigation — Account">
            <h3 className="footer-heading">Account</h3>
            <ul className="footer-links">
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/register">Create account</Link></li>
              <li><Link to="/my-bookings">My bookings</Link></li>
              <li><Link to="/profile">Profile</Link></li>
            </ul>
          </nav>

          <nav aria-label="Footer navigation — Support">
            <h3 className="footer-heading">Support</h3>
            <ul className="footer-links">
              <li><a href="#help">Help center</a></li>
              <li><a href="#safety">Safety</a></li>
              <li><a href="#cancellation">Cancellation policy</a></li>
              <li><a href="#contact">Contact us</a></li>
            </ul>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Travel Super App. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
