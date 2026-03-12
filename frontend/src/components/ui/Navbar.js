// src/components/ui/Navbar.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropRef = useRef(null);

  /* Unread message count from Redux store */
  const unreadCounts = useSelector((s) => s.chat?.unreadCounts || {});
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const getDashboardPath = () => {
    switch (user?.role) {
      case "admin":    return "/dashboard/admin";
      case "provider": return "/dashboard/provider";
      default:         return "/dashboard/user";
    }
  };

  const handleLogout = () => {
    logout();
    setDropOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <nav className="navbar">
      {/* ── Brand ── */}
      <div className="navbar-brand">
        <Link to="/">
          <img className="logo" src="/logo.png" alt="FixBuddy Logo" />
        </Link>
      </div>

      {/* ── Nav links ── */}
      <div className={`navbar-menu ${menuOpen ? "open" : ""}`}>
        <Link to="/"        className="nav-link">Home</Link>
        <Link to="/services" className="nav-link">Services</Link>
        <Link to="/about"   className="nav-link">About</Link>
      </div>

      {/* ── Right side ── */}
      <div className="navbar-right">
        {user ? (
          <div className="navbar-user-area">
            {/* User dropdown */}
            <div className="user-menu" ref={dropRef}>
              <button
                className="user-menu-btn"
                onClick={() => setDropOpen(!dropOpen)}
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="user-name">{user.name}</span>
                <span className="chevron">{dropOpen ? "▲" : "▼"}</span>
              </button>

              {dropOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <span className="dropdown-name">{user.name}</span>
                    <span className="dropdown-role">{user.role}</span>
                  </div>
                  <div className="dropdown-divider" />

                  <Link
                    to={getDashboardPath()}
                    className="dropdown-item"
                    onClick={() => setDropOpen(false)}
                  >
                    📊 Dashboard
                  </Link>

                  <Link
                    to="/chat"
                    className="dropdown-item"
                    onClick={() => setDropOpen(false)}
                  >
                    💬 Messages
                    {totalUnread > 0 && (
                      <span className="unread-badge">{totalUnread}</span>
                    )}
                  </Link>

                  {user.role === "user" && (
                    <Link
                      to="/dashboard/user"
                      className="dropdown-item"
                      onClick={() => setDropOpen(false)}
                    >
                      📋 My Bookings
                    </Link>
                  )}

                  {user.role === "provider" && (
                    <>
                      <Link
                        to="/provider/complaints"
                        className="dropdown-item"
                        onClick={() => setDropOpen(false)}
                      >
                        🗂️ Complaints
                      </Link>
                      <Link
                        to="/provider/register"
                        className="dropdown-item"
                        onClick={() => setDropOpen(false)}
                      >
                        📝 Provider Setup
                      </Link>
                      <Link
                        to="/provider/profile"
                        className="dropdown-item"
                        onClick={() => setDropOpen(false)}
                      >
                        👨‍🔧 Provider Profile
                      </Link>
                    </>
                  )}

                  {user?.role === "admin" && (
                    <>
                      <Link to="/admin/complaint"    className="dropdown-item">🗂️ Complaints</Link>
                      <Link to="/admin/verification" className="dropdown-item">✅ Verification</Link>
                    </>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-item dropdown-logout"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login"    className="btn-nav-outline">Login</Link>
            <Link to="/register" className="btn-nav-solid">Sign Up</Link>
          </div>
        )}

        {/* Hamburger */}
        <button
          className={`hamburger ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
