import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import TravelChatbot from '../chatbot/TravelChatbot';
import '../../styles/navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  return (
    <>
    <header className="navbar" role="banner">
      <div className="navbar-container">
        {/* Skip to main content — accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Logo */}
        <Link to="/" className="navbar-logo" aria-label="Travel Super App — Home">
          <span className="logo-icon" aria-hidden="true">✈️</span>
          <span className="logo-text">TravelApp</span>
        </Link>

        {/* Desktop nav */}
        <nav className="navbar-nav" aria-label="Main navigation">
          <NavLink
            to="/properties"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Explore
          </NavLink>
          <NavLink
            to="/packages"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Packages
          </NavLink>
          <NavLink
            to="/flights"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            ✈️ Flights
          </NavLink>
          <NavLink
            to="/transport"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Transport
          </NavLink>
          <NavLink
            to="/features"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Features
          </NavLink>
          {/* Property Manager nav links — host OR property_manager OR agent */}
          {(user?.role === 'host' || user?.role === 'property_manager' || user?.role === 'agent') && (
            <>
              <NavLink to="/manager/dashboard"    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/manager/properties"   className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Properties</NavLink>
              <NavLink to="/manager/bookings"     className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Bookings</NavLink>
            </>
          )}
          {/* Agent-specific nav links */}
          {user?.role === 'agent' && (
            <>
              <NavLink to="/agent/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Agent Hub</NavLink>
              <NavLink to="/agent/packages"  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My Packages</NavLink>
            </>
          )}
          {/* Driver nav links */}
          {user?.role === 'driver' && (
            <>
              <NavLink to="/driver/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/driver/trips"     className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My Trips</NavLink>
              <NavLink to="/driver/requests"  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Requests</NavLink>
            </>
          )}
          {/* Admin nav links */}
          {user?.role === 'admin' && (
            <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>🛡️ Admin</NavLink>
          )}
        </nav>

        {/* Right side */}
        <div className="navbar-right">
          {user ? (
            <div className="user-menu-wrapper">
              <button
                className="user-menu-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label={`User menu for ${user.firstName}`}
              >
                <span className="hamburger-icon" aria-hidden="true">☰</span>
                <div className="user-avatar" aria-hidden="true">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
                  )}
                </div>
              </button>

              {userMenuOpen && (
                <div
                  className="user-dropdown"
                  role="menu"
                  aria-label="User menu"
                  onBlur={() => setUserMenuOpen(false)}
                >
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user.firstName} {user.lastName}</p>
                    <p className="dropdown-email">{user.email}</p>
                  </div>
                  <div className="dropdown-divider" aria-hidden="true" />
                  <Link
                    to="/my-bookings"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    My bookings
                  </Link>
                  {(user.role === 'traveler') && (
                    <Link
                      to="/payments"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      💳 Payment history
                    </Link>
                  )}
                  {(user.role === 'traveler' || user.role === 'property_manager') && (
                    <Link
                      to="/my-transport"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My transport
                    </Link>
                  )}
                  {user.role === 'traveler' && (
                    <Link
                      to="/my-packages"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My packages
                    </Link>
                  )}
                  {user.role === 'agent' && (
                    <Link
                      to="/agent/bookings"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      📋 Package bookings
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="dropdown-divider" aria-hidden="true" />
                  <button
                    className="dropdown-item dropdown-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          <NavLink to="/properties" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
            Explore
          </NavLink>
          {user ? (
            <>
              {/* Manager links for host/property_manager role */}
              {(user.role === 'host' || user.role === 'property_manager') && (
                <>
                  <NavLink to="/manager/dashboard"    className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink to="/manager/properties"   className="mobile-nav-link" onClick={() => setMenuOpen(false)}>My Properties</NavLink>
                  <NavLink to="/manager/bookings"     className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Bookings</NavLink>
                  <NavLink to="/manager/availability" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Availability</NavLink>
                </>
              )}
              {user.role === 'driver' && (
                <>
                  <NavLink to="/driver/dashboard" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink to="/driver/trips"     className="mobile-nav-link" onClick={() => setMenuOpen(false)}>My Trips</NavLink>
                  <NavLink to="/driver/requests"  className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Requests</NavLink>
                </>
              )}
              {user.role === 'agent' && (
                <>
                  <NavLink to="/agent/dashboard" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink to="/agent/packages"  className="mobile-nav-link" onClick={() => setMenuOpen(false)}>My Packages</NavLink>
                </>
              )}
              <NavLink to="/my-bookings" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                My bookings
              </NavLink>
              <NavLink to="/profile" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                Profile
              </NavLink>
              <button className="mobile-nav-link mobile-nav-link--danger" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link to="/register" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
        </nav>
      )}
    </header>

    {/* ─── AI Travel Chatbot ────────────────────────────────────────────────
        Rendered OUTSIDE <header> so position:fixed is not clipped.
        Visible on every page for every role — logged in or not.
    ─────────────────────────────────────────────────────────────────────── */}
    <TravelChatbot />
    </>
  );
}
