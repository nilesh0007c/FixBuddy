// src/pages/complaints/ProviderComplaintPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axiosInstance';
import '../../App.css';
import '../user/Complaints.css';

const STATUS_CLASS = {
  Pending:        'status-pending',
  'Under Review': 'status-review',
  Resolved:       'status-resolved',
  Rejected:       'status-rejected',
};

const FILTERS = ['all', 'Pending', 'Under Review', 'Resolved', 'Rejected'];

const ProviderComplaintPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [reputation, setReputation] = useState(100);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints/provider', {
        params: { status: filter !== 'all' ? filter : undefined },
      });
      setComplaints(res.data.data || []);
      if (typeof res.data.reputationScore === 'number') {
        setReputation(res.data.reputationScore);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const repLabel =
    reputation >= 80 ? 'Excellent' :
    reputation >= 60 ? 'Good' :
    reputation >= 40 ? 'Fair' : 'Needs Attention';

  const counts = {
    total:    complaints.length,
    pending:  complaints.filter(c => c.status === 'Pending').length,
    review:   complaints.filter(c => c.status === 'Under Review').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  if (loading) return (
    <div className="pcp-page">
      <div className="pcp-loading">
        <div className="pcp-spinner" />
        Loading complaints…
      </div>
    </div>
  );

  return (
    <div className="pcp-page">
      <div className="pcp-inner">

        {/* ── Header ── */}
        <div className="pcp-page-header">
          <div>
            <h1 className="pcp-page-title">⚠️ Complaints Against You</h1>
            <p className="pcp-page-sub">Review complaints and track admin responses.</p>
          </div>

          <div className="pcp-rep-card">
            <div>
              <div className="pcp-rep-score">{reputation}%</div>
              <div className="pcp-rep-score-label">Reputation</div>
            </div>
            <div className="pcp-rep-meter">
              <div className="pcp-rep-bar-bg">
                <div className="pcp-rep-bar-fill" style={{ width: `${reputation}%` }} />
              </div>
              <div className="pcp-rep-text">{repLabel}</div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="pcp-stats">
          {[
            { num: counts.total,    label: 'Total' },
            { num: counts.pending,  label: 'Pending' },
            { num: counts.review,   label: 'Under Review' },
            { num: counts.resolved, label: 'Resolved' },
          ].map(s => (
            <div key={s.label} className="pcp-stat">
              <div className="pcp-stat-num">{s.num}</div>
              <div className="pcp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="pcp-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`pcp-filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* ── Complaint List ── */}
        {complaints.length === 0 ? (
          <div className="pcp-empty">
            <span className="pcp-empty-icon">🎉</span>
            <div className="pcp-empty-title">No complaints found</div>
            <div className="pcp-empty-sub">Keep up the great work!</div>
          </div>
        ) : (
          complaints.map((c, idx) => (
            <div
              key={c._id}
              className={`pcp-complaint-card priority-${c.priority?.toLowerCase() || 'normal'}`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Top row */}
              <div className="pcp-card-top">
                <div className="pcp-card-id-row">
                  <span className="pcp-card-id">#{c._id.slice(-8).toUpperCase()}</span>
                  {c.priority === 'High' && (
                    <span className="pcp-priority-badge high">🔴 High Priority</span>
                  )}
                </div>
                <div className="pcp-card-actions">
                  <span className={`pcp-status-chip ${STATUS_CLASS[c.status] || 'status-pending'}`}>
                    {c.status}
                  </span>
                </div>
              </div>

              {/* Customer info */}
              <div className="pcp-customer">
                <div className="pcp-customer-avatar">
                  {c.userId?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="pcp-customer-name">
                    Customer: {c.userId?.name || 'Unknown'}
                  </div>
                  {c.userId?.email && (
                    <div className="pcp-customer-email">{c.userId.email}</div>
                  )}
                </div>
              </div>

              {/* Category + complaint text */}
              <div className="pcp-cat">{c.complaintCategory}</div>
              <div className="pcp-text">{c.complaintText}</div>

              {/* Evidence */}
              {c.evidenceImages?.length > 0 && (
                <div className="pcp-evidence-imgs">
                  {c.evidenceImages.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt="evidence"
                      className="pcp-evidence-img"
                      onClick={() => window.open(img.url, '_blank')}
                    />
                  ))}
                </div>
              )}

              {/* Service meta */}
              <div className="pcp-service-meta">
                <span>📋 Service ID: {c.serviceRequestId?._id?.slice(-8).toUpperCase() || '—'}</span>
                {c.serviceRequestId?.scheduledDate && (
                  <span>
                    📅 {new Date(c.serviceRequestId.scheduledDate).toLocaleDateString('en-IN')}
                  </span>
                )}
                <span>🕐 Filed: {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
              </div>

              {/* Admin reply */}
              {c.adminReply?.message && (
                <div className="pcp-admin-reply">
                  <strong>Admin Response</strong>{' '}
                  ({new Date(c.adminReply.repliedAt).toLocaleDateString('en-IN')}):
                  <br />{c.adminReply.message}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProviderComplaintPage;