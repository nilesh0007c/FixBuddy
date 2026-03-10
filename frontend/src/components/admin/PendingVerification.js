// src/components/ui/PendingVerification.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import './PendingVerification.css';

const BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function PendingVerification() {
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState({ text: '', type: '' });

  useEffect(() => {
    api.get('/admin/providers/pending')
      .then(({ data }) => setProviders(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleAction = async (id, type) => {
    try {
      await api.put(`/admin/providers/${id}/${type}`);
      setProviders((prev) => prev.filter((p) => p._id !== id));
      showMsg(type === 'verify' ? '✅ Provider verified!' : '❌ Provider rejected.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Loading verification queue…</p>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dh-left">
          <div className="dh-avatar">⏳</div>
          <div>
            <h1>Pending Verifications</h1>
            <p>{providers.length} provider{providers.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {msg.text}
        </div>
      )}

      {providers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>All clear!</h3>
          <p>No providers pending verification.</p>
        </div>
      ) : (
        <div className="bookings-section">
          {providers.map((p) => (
            <div key={p._id} className="verification-card">
              <div className="verification-card-header">
                <div className="verification-card-info">
                  <h3>{p.name}</h3>
                  <p className="verification-card-email">{p.email} · {p.phone}</p>
                  <p className="verification-card-city">📍 {p.location?.city}</p>
                  <p className="verification-card-date">
                    Submitted: {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="verification-card-actions">
                  <button className="btn-success" onClick={() => handleAction(p._id, 'verify')}>
                    ✅ Verify
                  </button>
                  <button className="btn-danger"  onClick={() => handleAction(p._id, 'reject')}>
                    ❌ Reject
                  </button>
                </div>
              </div>

              <div className="verification-images">
                <div className="verification-img-box">
                  <div className="verification-img-label">Live Photo</div>
                  <img src={`${BASE}${p.liveImage}`} alt="Live" />
                </div>
                <div className="verification-img-box">
                  <div className="verification-img-label">Government ID</div>
                  <img src={`${BASE}${p.idProofImage}`} alt="ID Proof" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}