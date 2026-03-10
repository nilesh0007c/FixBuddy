// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import MapView from '../ui/MapView';
import ProviderCard from '../ui/ProviderCard';
import { useAuth } from '../../context/AuthContext';
import './HomePage.css';

const CATEGORIES = [
  { icon: '🔧', name: 'Plumber' },
  { icon: '⚡', name: 'Electrician' },
  { icon: '📚', name: 'Tutor' },
  { icon: '🪚', name: 'Carpenter' },
  { icon: '🧹', name: 'Cleaner' },
  { icon: '🎨', name: 'Painter' },
  { icon: '🔩', name: 'Mechanic' },
  { icon: '👨‍🍳', name: 'Cook' },
];

const HOW_IT_WORKS = [
  { step: 1, title: 'Search Services',  desc: 'Browse verified providers near you by category or location.' },
  { step: 2, title: 'Choose a Provider', desc: 'Compare ratings, prices, and reviews to find the best match.' },
  { step: 3, title: 'Book Instantly',   desc: 'Schedule your service and get confirmation right away.' },
  { step: 4, title: 'Rate & Review',    desc: 'After service completion, share your experience with others.' },
];

export default function HomePage() {
  const { user }                                  = useAuth();
  const [providers,    setProviders]    = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [cityFilter,   setCityFilter]   = useState('');
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        ()    => { if (user?.city) setCityFilter(user.city); }
      );
    } else if (user?.city) {
      setCityFilter(user.city);
    }
  }, [user]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (cityFilter)   params.city    = cityFilter;
      if (searchQuery)  params.service  = searchQuery;
      if (userLocation) { params.lat = userLocation[0]; params.lng = userLocation[1]; }

      const response = await api.get('/providers', { params });
      if (response?.data) {
        setProviders(response.data.providers || response.data.data || []);
      }
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        console.error('Fetch providers error:', err.response?.data || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cityFilter || userLocation) fetchProviders();
  }, [cityFilter, userLocation]); // eslint-disable-line

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchProviders(); };

  return (
    <div className="home-page">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <h1>Find Trusted <span>Local Services</span></h1>
          <p>Every provider is manually verified by our team. Book plumbers, electricians, tutors &amp; more — all near you.</p>

          <div className="hero-search">
            <input
              type="text"
              placeholder="Search service (e.g. Plumber, Tutor)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
            />
            <input
              type="text"
              placeholder="City"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="city-input"
            />
            <button onClick={fetchProviders} className="btn-primary search-btn">
              🔍 Search
            </button>
          </div>

          <div className="hero-trust">
            <span>✅ Verified Providers</span>
            <span>⭐ Top Rated</span>
            <span>📍 Near You</span>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="section">
        <h2 className="section-title">Browse <span>Services</span></h2>
        <div className="categories-grid">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              to={`/services?category=${cat.name}`}
              className="category-card"
            >
              <span className="category-icon">{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Map + Providers ── */}
      <section className="section section--no-top-pad">
        <div className="section-header-row">
          <h2 className="section-title section-title--left">
            {loading ? 'Searching…' : `${providers.length} Verified Providers`}
            {cityFilter && <span className="section-city-label">in {cityFilter}</span>}
          </h2>
          <Link to="/services" className="btn-outline">View All</Link>
        </div>

        <div className="map-wrapper">
          <MapView providers={providers} userLocation={userLocation} />
        </div>

        {loading ? (
          <div className="providers-grid-home">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No providers found</h3>
            <p>Try searching a different service or city</p>
          </div>
        ) : (
          <div className="providers-grid-home">
            {providers.slice(0, 6).map((p) => (
              <ProviderCard key={p._id} provider={p} />
            ))}
          </div>
        )}

        {providers.length > 6 && (
          <div className="see-all-row">
            <Link to="/services" className="btn-outline btn-large">
              See All {providers.length} Providers
            </Link>
          </div>
        )}
      </section>

      {/* ── How It Works ── */}
      <section className="section how-it-works-section">
        <h2 className="section-title">How It <span>Works</span></h2>
        <div className="steps-grid">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="step-card">
              <div className="step-number">{step}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      {!user && (
        <div className="cta-wrapper">
          <div className="cta-section">
            <h2>Are You a Service Professional?</h2>
            <p>Join thousands of verified providers earning more with LocalServe.</p>
            <div className="cta-actions">
              <Link to="/register" className="btn-primary btn-large">Register as Provider</Link>
              <Link to="/services" className="btn-outline btn-large">Browse Services</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}