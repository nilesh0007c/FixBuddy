// frontend/src/components/admin/AdminComplaintPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axiosInstance';
import './AdminComplaintPanel.css';

const STATUS_BADGE_CLASS = {
  Pending:        'acp-badge-pending',
  'Under Review': 'acp-badge-review',
  Resolved:       'acp-badge-resolved',
  Rejected:       'acp-badge-rejected',
};

const STATUS_OPTIONS = ['Pending', 'Under Review', 'Resolved', 'Rejected'];

/* ── Single complaint card with inline reply ── */
const ComplaintCard = React.memo(({ complaint: c, idx, onReply }) => {
  const [replyText, setReplyText] = useState(c.adminReply?.message || '');
  const [newStatus, setNewStatus] = useState(c.status);
  const [saving,    setSaving]    = useState(false);
  const [localMsg,  setLocalMsg]  = useState('');

  const handleReply = async () => {
    if (!replyText.trim() && newStatus === c.status) return;
    setSaving(true);
    setLocalMsg('');
    try {
      await onReply(c._id, replyText, newStatus);
      setLocalMsg('✅ Saved successfully');
      setTimeout(() => setLocalMsg(''), 3000);
    } catch {
      setLocalMsg('❌ Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const providerName  = c.providerId?.user?.name || 'Provider';
  const providerEmail = c.providerId?.user?.email || '';
  const userName      = c.userId?.name || 'User';
  const userEmail     = c.userId?.email || '';

  return (
    <div
      className={`acp-complaint-card ${c.priority === 'High' ? 'high-priority' : ''}`}
      style={{ animationDelay: `${idx * 0.04}s` }}
    >
      {/* Strip header */}
      <div className="acp-card-strip">
        <span className="acp-card-id">#{c._id.slice(-8).toUpperCase()}</span>
        {c.priority === 'High' && (
          <span className="acp-high-badge">🔴 High Priority</span>
        )}
        <span className={`acp-status-badge ${STATUS_BADGE_CLASS[c.status] || 'acp-badge-pending'}`}>
          {c.status}
        </span>
        <span className="acp-card-date">
          {new Date(c.createdAt).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>

      <div className="acp-card-body">
        {/* Parties */}
        <div className="acp-parties">
          <div className="acp-party">
            <div className="acp-party-avatar user">{userName[0]?.toUpperCase()}</div>
            <div>
              <div className="acp-party-role">Customer</div>
              <div className="acp-party-name">{userName}</div>
              {userEmail && <div className="acp-party-email">{userEmail}</div>}
            </div>
          </div>
          <div className="acp-party">
            <div className="acp-party-avatar provider">{providerName[0]?.toUpperCase()}</div>
            <div>
              <div className="acp-party-role">Provider</div>
              <div className="acp-party-name">{providerName}</div>
              {providerEmail && <div className="acp-party-email">{providerEmail}</div>}
            </div>
          </div>
        </div>

        {/* Category + complaint text */}
        <div className="acp-cat-label">{c.complaintCategory}</div>
        <div className="acp-complaint-text">{c.complaintText}</div>

        {/* Evidence images */}
        {c.evidenceImages?.length > 0 && (
          <div className="acp-evidence">
            {c.evidenceImages.map((img, i) => (
              <img
                key={i}
                src={img.url}
                alt={`evidence-${i}`}
                className="acp-evidence-img"
                onClick={() => window.open(img.url, '_blank')}
                title="Click to view full image"
              />
            ))}
          </div>
        )}

        {/* Admin reply section */}
        <div className="acp-reply-section">
          <div className="acp-reply-section-title">🔧 Admin Action</div>

          {c.adminReply?.message && (
            <div className="acp-existing-reply">
              <strong>Previous reply:</strong> {c.adminReply.message}
              <br />
              <small>
                {new Date(c.adminReply.repliedAt).toLocaleDateString('en-IN')}
              </small>
            </div>
          )}

          {localMsg && (
            <div className={`acp-reply-msg ${localMsg.startsWith('✅') ? 'success' : 'error'}`}>
              {localMsg}
            </div>
          )}

          <div className="acp-reply-form">
            <textarea
              className="acp-reply-textarea"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply to the customer…"
              rows={3}
            />
            <div className="acp-reply-actions">
              <select
                className="acp-status-sel"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                className="acp-reply-btn"
                onClick={handleReply}
                disabled={saving}
              >
                {saving ? '⏳ Saving…' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ════════════════════════════════════
   MAIN PANEL
════════════════════════════════════ */
const AdminComplaintPanel = () => {
  const [complaints,   setComplaints]   = useState([]);
  const [analytics,    setAnalytics]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriority]  = useState('all');
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [msg,          setMsg]          = useState({ text: '', type: '' });

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'all')   params.status   = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (search.trim())            params.search   = search.trim();

      const res = await api.get('/complaints/admin', { params });
      setComplaints(res.data.data || []);
      setAnalytics(res.data.analytics || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (e) {
      console.error(e);
      showMsg('Failed to load complaints.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, search]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  /* Debounce search */
  useEffect(() => {
    const id = setTimeout(() => { setPage(1); fetchComplaints(); }, 500);
    return () => clearTimeout(id);
  }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleReply = async (id, message, status) => {
    await api.put(`/complaints/admin-reply/${id}`, { message, status });
    setComplaints(prev =>
      prev.map(c =>
        c._id === id
          ? { ...c, status, adminReply: { message, repliedAt: new Date() } }
          : c
      )
    );
    showMsg(`Complaint #${id.slice(-6).toUpperCase()} updated.`);
  };

  /* Build analytics counts */
  const getCount = status => {
    const found = analytics.find(a => a._id === status);
    return found?.count || 0;
  };
  const total = analytics.reduce((a, b) => a + (b.count || 0), 0);

  return (
    <div className="acp-page">
      <div className="acp-inner">

        {/* Header */}
        <div className="acp-header">
          <h1>🛡️ Complaint Management</h1>
          <p>Review, respond to, and resolve customer complaints.</p>
        </div>

        {/* Alert */}
        {msg.text && (
          <div className={`acp-alert ${msg.type}`}>
            {msg.type === 'error' ? '❌' : '✅'} {msg.text}
          </div>
        )}

        {/* Analytics */}
        <div className="acp-analytics">
          <div className="acp-stat">
            <div className="acp-stat-num">{total}</div>
            <div className="acp-stat-label">Total</div>
          </div>
          <div className="acp-stat">
            <div className="acp-stat-num amber">{getCount('Pending')}</div>
            <div className="acp-stat-label">Pending</div>
          </div>
          <div className="acp-stat">
            <div className="acp-stat-num">{getCount('Under Review')}</div>
            <div className="acp-stat-label">Under Review</div>
          </div>
          <div className="acp-stat">
            <div className="acp-stat-num green">{getCount('Resolved')}</div>
            <div className="acp-stat-label">Resolved</div>
          </div>
        </div>

        {/* Controls */}
        <div className="acp-controls">
          <input
            className="acp-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by user, text, category…"
          />
          <select
            className="acp-filter-sel"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="acp-filter-sel"
            value={priorityFilter}
            onChange={e => { setPriority(e.target.value); setPage(1); }}
          >
            <option value="all">All Priority</option>
            <option value="High">🔴 High Priority</option>
            <option value="Normal">Normal</option>
          </select>
          <button className="acp-refresh-btn" onClick={fetchComplaints}>
            ⟳ Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="acp-loading">
            <div className="acp-spinner" />
            Loading complaints…
          </div>
        ) : complaints.length === 0 ? (
          <div className="acp-empty">
            <span className="acp-empty-icon">📭</span>
            <div className="acp-empty-title">No complaints match your filters.</div>
          </div>
        ) : (
          complaints.map((c, idx) => (
            <ComplaintCard
              key={c._id}
              complaint={c}
              idx={idx}
              onReply={handleReply}
            />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="acp-pagination">
            <button
              className="acp-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`acp-page-btn ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button
              className="acp-page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminComplaintPanel;