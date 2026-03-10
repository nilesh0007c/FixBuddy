// src/pages/services/ServicesPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import StarRating from '../../components/ui/StarRating';
import '../../App.css';
import './ServicesPage.css';

const CATEGORIES = [
  'All', 'Plumber', 'Electrician', 'Tutor',
  'Carpenter', 'Cleaner', 'Painter', 'Mechanic', 'Cook',
];

const ServicesPage = () => {
  const [searchParams]            = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filters,   setFilters]   = useState({
    category:  searchParams.get('category') || '',
    city:      '',
    minRating: '',
    available: false,
    search:    '',
  });

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.city)      params.city      = filters.city;
      if (filters.minRating) params.minRating = filters.minRating;
      if (filters.available) params.available = 'true';
      if (filters.search)    params.search    = filters.search;

      const res = await api.get('/providers', { params });
      setProviders(res.data.providers || res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); }, [filters]); // eslint-disable-line

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const clearFilters = () =>
    setFilters({ category: '', city: '', minRating: '', available: false, search: '' });

  return (
    <div className="services-page">

      {/* ── Header ── */}
      <div className="services-header">
        <h1>Find Service Providers</h1>
        <div className="search-bar">
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search by name or service..."
          />
        </div>
      </div>

      <div className="services-layout">

        {/* ── Filters Sidebar ── */}
        <aside className="filters-sidebar">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Category</label>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              {CATEGORIES.map(c => (
                <option key={c} value={c === 'All' ? '' : c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              placeholder="Enter city..."
            />
          </div>

          <div className="filter-group">
            <label>Min Rating</label>
            <select name="minRating" value={filters.minRating} onChange={handleFilterChange}>
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="available"
                checked={filters.available}
                onChange={handleFilterChange}
              />
              Available Now Only
            </label>
          </div>

          <button className="btn-outline btn-full" onClick={clearFilters}>
            Clear Filters
          </button>
        </aside>

        {/* ── Provider List ── */}
        <div className="providers-grid">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Finding providers...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No providers found</h3>
              <p>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            providers.map(provider => (
              <div key={provider._id} className="provider-card">
                <div className="provider-card-header">
                  <div className="provider-avatar">
                    {provider.user?.name?.charAt(0).toUpperCase() || provider.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="provider-info">
                    <h3>{provider.user?.name || provider.name}</h3>
                    <p className="provider-location">📍 {provider.location?.city || 'Location not set'}</p>
                    <div className="rating-row">
                      <StarRating rating={provider.rating || 0} />
                      <span className="rating-text">
                        {provider.rating?.toFixed(1) || '0.0'} ({provider.totalReviews || 0} reviews)
                      </span>
                    </div>
                  </div>
                  <div className={`availability-badge ${provider.availability?.isAvailable ? 'available' : 'unavailable'}`}>
                    {provider.availability?.isAvailable ? '✓ Available' : '✗ Busy'}
                  </div>
                </div>

                {provider.services?.length > 0 && (
                  <div className="provider-services">
                    {provider.services.slice(0, 3).map((svc, i) => (
                      <span key={i} className="service-tag">
                        {typeof svc === 'string' ? svc : `${svc.category} — ₹${svc.price}/${svc.priceUnit}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="provider-card-footer">
                  <span>{provider.experience || 0} yrs exp</span>
                  {provider.isVerified && (
                    <span className="verified-badge">✓ Verified</span>
                  )}
                  <Link to={`/providers/${provider._id}`} className="btn-primary btn-sm">
                    View Profile
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;