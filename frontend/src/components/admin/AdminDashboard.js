// frontend/src/components/admin/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import BanModal from './BanModal';
import './AdminDashboard.css';

/* ── Stat card config ── */
const STAT_CONFIG = [
  { key: 'totalUsers',           icon: '👥', label: 'Total Users',     color: '#3b82f6' },
  { key: 'totalProviders',       icon: '🔧', label: 'Total Providers', color: '#10b981' },
  { key: 'verifiedProviders',    icon: '✅', label: 'Verified',        color: '#059669' },
  { key: 'pendingVerifications', icon: '⏳', label: 'Pending Verify',  color: '#f59e0b' },
  { key: 'totalBookings',        icon: '📅', label: 'Total Bookings',  color: '#8b5cf6' },
  { key: 'bannedUsers',          icon: '🚫', label: 'Suspended',       color: '#ef4444' },
];

const STATUS_BADGE_CLASS = {
  pending:   'pending',
  accepted:  'accepted',
  completed: 'completed',
  rejected:  'rejected',
  cancelled: 'cancelled',
};

/* ── Missing route inline warning ── */
const RouteMissing = ({ endpoint }) => (
  <div className="ad-missing-route">
    <strong>⚠️ Route not registered:</strong>{' '}
    <code>{endpoint}</code>
    <div className="ad-missing-route-note">
      Add this route to <strong>adminRoutes.js</strong> and make sure{' '}
      <code>app.use('/api/admin', adminRoutes)</code>{' '}
      is in your <strong>server.js</strong>.
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats,     setStats]     = useState(null);
  const [bookings,  setBookings]  = useState([]);
  const [users,     setUsers]     = useState([]);
  const [providers, setProviders] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [msg,       setMsg]       = useState({ text: '', type: '' });

  const [userSearch,     setUserSearch]     = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [userFilter,     setUserFilter]     = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [banTarget,      setBanTarget]      = useState(null);
  const [banTargetType,  setBanTargetType]  = useState('user');

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  /* Uses Promise.allSettled — one missing route does NOT crash the page */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const errs = {};

    const [statsR, bookingsR, usersR, providersR] = await Promise.allSettled([
      api.get('/admin/stats'),
      api.get('/admin/bookings/all'),
      api.get('/admin/users'),
      api.get('/admin/providers'),
    ]);

    const handle = (result, key, extractor, fallback) => {
      if (result.status === 'fulfilled') return extractor(result.value);
      const status = result.reason?.response?.status;
      errs[key] = status === 404
        ? 'MISSING'
        : result.reason?.response?.data?.message || 'Request failed';
      return fallback;
    };

    setStats(     handle(statsR,     'stats',     r => r.data.data,           null));
    setBookings(  handle(bookingsR,  'bookings',  r => r.data.bookings || [], []));
    setUsers(     handle(usersR,     'users',     r => r.data.data    || [],  []));
    setProviders( handle(providersR, 'providers', r => r.data.data    || [],  []));

    setSectionErrors(errs);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleBanSuccess = () => { showMsg('Account suspended'); fetchAll(); };

  const handleReactivate = async (id, type) => {
    if (!window.confirm('Reactivate this account?')) return;
    try {
      await api.post(`/admin/${type === 'provider' ? 'providers' : 'users'}/${id}/reactivate`);
      showMsg('Account reactivated');
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleProviderAction = async (id, action) => {
    try {
      await api.put(`/admin/providers/${id}/${action}`);
      showMsg(`Provider ${action}d`);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const q  = userSearch.toLowerCase();
    const ms = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const mf = userFilter === 'all' ? true : userFilter === 'banned' ? u.isBanned : !u.isBanned;
    return ms && mf;
  });

  const filteredProviders = providers.filter(p => {
    const q  = providerSearch.toLowerCase();
    const ms = !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    const mf =
      providerFilter === 'all'      ? true :
      providerFilter === 'banned'   ? p.isBanned :
      providerFilter === 'verified' ? p.verificationStatus === 'verified' :
      p.verificationStatus === 'pending';
    return ms && mf;
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  const missingRoutes = Object.entries(sectionErrors)
    .filter(([, v]) => v === 'MISSING')
    .map(([k]) => ({
      stats:     'GET /api/admin/stats',
      bookings:  'GET /api/admin/bookings/all',
      users:     'GET /api/admin/users',
      providers: 'GET /api/admin/providers',
    }[k]));

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="dh-left">
          <div className="dh-avatar">
            <img className="logo" src="/ap.png" alt="FixBuddy Logo" />
          </div>
          <div>
            <h1>Admin Dashboard</h1>
            <p>LocalServe management</p>
          </div>
        </div>
        <div className="ad-header-actions">
          <button className="ad-refresh-btn" onClick={fetchAll}>
            🔄 Refresh
          </button>
          <Link to="/admin/verification" className="btn-primary">
            ⏳ Verify Providers
            {(stats?.pendingVerifications || 0) > 0 && (
              <span className="ad-pending-badge">
                {stats.pendingVerifications}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Global missing-routes banner ── */}
      {missingRoutes.length > 0 && (
        <div className="ad-missing-banner">
          <div className="ad-missing-banner-title">
            ⚠️ Missing API routes — add these to fix the errors below:
          </div>
          <div className="ad-missing-code-block">
            <span className="ad-missing-code-comment">{'// server.js — register admin routes:'}</span><br />
            <span className="ad-missing-code-keyword">const</span> adminRoutes{' '}
            = <span className="ad-missing-code-keyword">require</span>
            (<span className="ad-missing-code-string">'./routes/adminRoutes'</span>);<br />
            app.<span className="ad-missing-code-call">use</span>
            (<span className="ad-missing-code-string">'/api/admin'</span>, adminRoutes);
          </div>
          {missingRoutes.map(r => (
            <div key={r} className="ad-missing-route-item">
              ❌ <code>{r}</code>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats ── */}
      {sectionErrors.stats === 'MISSING' ? (
        <div style={{ marginBottom: 20 }}>
          <RouteMissing endpoint="GET /api/admin/stats" />
        </div>
      ) : (
        <div className="ad-stats-grid">
          {STAT_CONFIG.map(({ key, icon, label, color }) => (
            <div
              key={key}
              className="ad-stat-card"
              style={{ borderBottomColor: color }}
            >
              <div className="ad-stat-icon">{icon}</div>
              <div className="ad-stat-value" style={{ color }}>
                {stats?.[key] ?? '—'}
              </div>
              <div className="ad-stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Notification ── */}
      {msg.text && (
        <div className={`ad-notification ${msg.type}`}>
          {msg.text}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="ad-tabs">
        {[
          { id: 'overview',  label: '📊 Overview' },
          { id: 'users',     label: `👥 Users (${users.length})` },
          { id: 'providers', label: `🔧 Providers (${providers.length})` },
          { id: 'bookings',  label: `📋 Bookings (${bookings.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            className={`ad-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div className="ad-overview">

          {/* Recent bookings */}
          <div className="ad-section-card">
            <div className="ad-section-header">📋 Recent Bookings</div>
            {sectionErrors.bookings === 'MISSING' ? (
              <div style={{ padding: 16 }}>
                <RouteMissing endpoint="GET /api/admin/bookings/all" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="ad-list-empty">No bookings yet.</p>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      {['Customer','Provider','Service','Amount','Status','Date'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 10).map(b => (
                      <tr key={b._id}>
                        <td>{b.user?.name || 'N/A'}</td>
                        <td>{b.provider?.user?.name || b.provider?.name || 'N/A'}</td>
                        <td>{b.service?.name || '—'}</td>
                        <td className="td-bold">
                          ₹{b.finalPrice || b.totalAmount || '—'}
                          {b.priceNegotiated && <span className="ad-neg-badge">✓neg</span>}
                        </td>
                        <td>
                          <span className={`ad-status-badge ${STATUS_BADGE_CLASS[b.status] || 'pending'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="td-muted">{new Date(b.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent users */}
          <div className="ad-section-card">
            <div className="ad-section-header">👥 Recent Users</div>
            {sectionErrors.users === 'MISSING' ? (
              <div style={{ padding: 16 }}>
                <RouteMissing endpoint="GET /api/admin/users" />
              </div>
            ) : (
              <div className="ad-users-mini-grid">
                {users.slice(0, 8).map(u => (
                  <div key={u._id} className={`ad-user-mini-card ${u.isBanned ? 'banned' : ''}`}>
                    <div className="ad-user-mini-avatar">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="ad-user-mini-info">
                      <div className="ad-user-mini-name">{u.name}</div>
                      <div className="ad-user-mini-email">{u.email}</div>
                      <div className="ad-user-mini-tags">
                        <span className="ad-tag role">{u.role}</span>
                        {u.isBanned && <span className="ad-tag banned">🚫</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ USERS ══ */}
      {activeTab === 'users' && (
        sectionErrors.users === 'MISSING' ? (
          <RouteMissing endpoint="GET /api/admin/users" />
        ) : (
          <div>
            <div className="ad-filter-bar">
              <input
                className="ad-search-input"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="🔍  Name or email..."
              />
              {['all', 'active', 'banned'].map(f => (
                <button
                  key={f}
                  className={`ad-filter-btn ${userFilter === f ? 'active' : ''}`}
                  onClick={() => setUserFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="ad-list">
              {filteredUsers.length === 0 && (
                <div className="ad-list-empty">No users match your filters.</div>
              )}
              {filteredUsers.map(u => (
                <div
                  key={u._id}
                  className={`ad-list-row ${u.isBanned ? 'banned' : ''}`}
                >
                  <div className={`ad-list-avatar ${u.isBanned ? 'banned' : ''}`}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="ad-list-info">
                    <div className="ad-list-name">{u.name}</div>
                    <div className="ad-list-email">{u.email}</div>
                    <div className="ad-list-tags">
                      <span className="ad-tag role">{u.role}</span>
                      {u.isBanned
                        ? <span className="ad-tag banned">🚫 Suspended</span>
                        : <span className="ad-tag active">● Active</span>
                      }
                    </div>
                    {u.isBanned && u.banReason && (
                      <div className="ad-ban-reason">
                        "{u.banReason.substring(0, 80)}..."
                      </div>
                    )}
                  </div>
                  <div className="ad-list-date">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                  <div className="ad-action-btns">
                    {!u.isBanned ? (
                      <button
                        className="ad-btn suspend"
                        onClick={() => { setBanTarget(u); setBanTargetType('user'); }}
                      >
                        🚫 Suspend
                      </button>
                    ) : (
                      <button
                        className="ad-btn reactivate"
                        onClick={() => handleReactivate(u._id, 'user')}
                      >
                        ✅ Reactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ══ PROVIDERS ══ */}
      {activeTab === 'providers' && (
        sectionErrors.providers === 'MISSING' ? (
          <RouteMissing endpoint="GET /api/admin/providers" />
        ) : (
          <div>
            <div className="ad-filter-bar">
              <input
                className="ad-search-input"
                value={providerSearch}
                onChange={e => setProviderSearch(e.target.value)}
                placeholder="🔍  Search providers..."
              />
              {['all', 'pending', 'verified', 'banned'].map(f => (
                <button
                  key={f}
                  className={`ad-filter-btn ${providerFilter === f ? 'active' : ''}`}
                  onClick={() => setProviderFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="ad-list">
              {filteredProviders.length === 0 && (
                <div className="ad-list-empty">No providers match.</div>
              )}
              {filteredProviders.map(p => {
                const rowClass = p.isBanned ? 'banned'
                  : p.verificationStatus === 'verified' ? 'provider-verified'
                  : 'provider-pending';
                return (
                  <div key={p._id} className={`ad-list-row ${rowClass}`}>
                    <div className="ad-list-avatar neutral">
                      {p.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="ad-list-info">
                      <div className="ad-list-name">{p.name}</div>
                      <div className="ad-list-email">{p.email || p.user?.email}</div>
                      <div className="ad-list-tags">
                        <span className={`ad-tag ${p.verificationStatus}`}>
                          {p.verificationStatus}
                        </span>
                        {p.isBanned && (
                          <span className="ad-tag banned">🚫 Suspended</span>
                        )}
                        <span className="ad-tag rating">
                          ⭐ {p.rating?.toFixed(1) || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="ad-action-btns">
                      {p.verificationStatus === 'pending' && !p.isBanned && (
                        <>
                          <button
                            className="ad-btn verify"
                            onClick={() => handleProviderAction(p._id, 'verify')}
                          >
                            ✅ Verify
                          </button>
                          <button
                            className="ad-btn reject"
                            onClick={() => handleProviderAction(p._id, 'reject')}
                          >
                            ✗ Reject
                          </button>
                        </>
                      )}
                      {!p.isBanned ? (
                        <button
                          className="ad-btn ban-sm"
                          onClick={() => { setBanTarget(p); setBanTargetType('provider'); }}
                        >
                          🚫 Suspend
                        </button>
                      ) : (
                        <button
                          className="ad-btn reactivate"
                          onClick={() => handleReactivate(p._id, 'provider')}
                        >
                          ✅ Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ══ BOOKINGS ══ */}
      {activeTab === 'bookings' && (
        sectionErrors.bookings === 'MISSING' ? (
          <RouteMissing endpoint="GET /api/admin/bookings/all" />
        ) : (
          <div className="ad-bookings-wrap">
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    {['Customer','Provider','Service','Amount','Status','Date'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && (
                    <tr className="no-data">
                      <td colSpan={6}>No bookings.</td>
                    </tr>
                  )}
                  {bookings.map(b => (
                    <tr key={b._id}>
                      <td>{b.user?.name || 'N/A'}</td>
                      <td>{b.provider?.user?.name || b.provider?.name || 'N/A'}</td>
                      <td>{b.service?.name || '—'}</td>
                      <td className="td-bold">
                        ₹{b.finalPrice || b.totalAmount || '—'}
                        {b.priceNegotiated && (
                          <span className="ad-neg-badge">✓</span>
                        )}
                      </td>
                      <td>
                        <span className={`ad-status-badge ${STATUS_BADGE_CLASS[b.status] || 'pending'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="td-muted">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Ban modal ── */}
      {banTarget && (
        <BanModal
          target={banTarget}
          targetType={banTargetType}
          onClose={() => setBanTarget(null)}
          onSuccess={handleBanSuccess}
        />
      )}
    </div>
  );
}