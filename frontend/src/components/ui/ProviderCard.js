// src/components/ui/ProviderCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import '../../App.css';
import './ProviderCard.css';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * ProviderCard
 * Reusable card displayed in grids and carousels.
 * Props: provider — provider object from the API
 */
export default function ProviderCard({ provider }) {
  const {
    _id, name, profileImage, services, rating, totalReviews,
    location, distance, subscription, hourlyRate, availability,
  } = provider;

  const isAvailable  = availability?.isAvailable;
  const topServices  = services?.slice(0, 3) || [];
  const isPremium    = subscription === 'premium';

  return (
    <div className={`provider-card ${isPremium ? 'provider-card-premium' : ''}`}>
      {isPremium && (
        <div className="premium-strip">⭐ PREMIUM PROVIDER</div>
      )}

      <div className="provider-card-inner">
        {/* Avatar + Info */}
        <div className="provider-card-header">
          <div className="provider-avatar-wrap">
            {profileImage ? (
              <img
                src={`${BASE_URL}${profileImage}`}
                alt={name}
                className="provider-img"
              />
            ) : (
              <div className="provider-avatar">
                {name?.[0]?.toUpperCase()}
              </div>
            )}
            <span
              className={`avail-dot ${isAvailable ? 'dot-green' : 'dot-red'}`}
              title={isAvailable ? 'Available' : 'Unavailable'}
            />
          </div>

          <div className="provider-info">
            <h3 className="provider-name">{name}</h3>
            <p className="provider-location">📍 {location?.city || 'Location not set'}</p>
            <div className="provider-rating-row">
              <StarRating rating={rating || 0} />
              <span className="rating-text">
                {rating ? rating.toFixed(1) : '0.0'} ({totalReviews || 0})
              </span>
              {distance != null && (
                <span className="distance-badge">{distance.toFixed(1)} km</span>
              )}
            </div>
          </div>
        </div>

        {/* Services */}
        {topServices.length > 0 && (
          <div className="provider-services">
            {topServices.map((svc, i) => (
              <span key={i} className="service-tag">
                {typeof svc === 'string' ? svc : svc.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="provider-card-footer">
          {hourlyRate > 0 && (
            <span className="hourly-rate">
              ₹{hourlyRate}<small>/hr</small>
            </span>
          )}
          <Link to={`/providers/${_id}`} className="btn-primary btn-sm">
            View &amp; Book →
          </Link>
        </div>
      </div>
    </div>
  );
}