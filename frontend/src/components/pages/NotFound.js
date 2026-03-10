// src/pages/NotFound.jsx
// Uses .not-found-page from App.css
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="not-found-page">
    <div className="not-found-icon">🔍</div>
    <h2 className="not-found-title">Page Not Found</h2>
    <p className="not-found-desc">The page you're looking for doesn't exist.</p>
    <Link to="/" className="btn-primary">Go Home</Link>
  </div>
);

export default NotFound;