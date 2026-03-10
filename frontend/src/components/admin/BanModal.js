// frontend/src/components/admin/BanModal.jsx
import React, { useState } from 'react';
import api from '../../api/axiosInstance';
import './BanModal.css';

const PRESET_REASONS = [
  'Fraudulent activity or scam behaviour',
  'Repeated no-shows or last-minute cancellations',
  'Harassment, abuse, or threatening behaviour',
  'Fake profile or misrepresentation of identity',
  'Violation of platform terms of service',
  'Spam, unsolicited messages, or promotions',
  'Other (describe below)',
];

/**
 * BanModal
 * @prop {object}              target       — User or Provider document to ban
 * @prop {'user'|'provider'}   targetType
 * @prop {function}            onClose      — close the modal
 * @prop {function}            onSuccess    — called with { targetId, action, reason }
 */
const BanModal = ({ target, targetType = 'user', onClose, onSuccess }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote,     setCustomNote]     = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  if (!target) return null;

  const fullReason = selectedReason === 'Other (describe below)'
    ? customNote.trim()
    : selectedReason + (customNote.trim() ? `. ${customNote.trim()}` : '');

  const isValid = fullReason.length >= 10;

  const handleBan = async () => {
    if (!isValid) {
      setError('Please provide a valid reason (minimum 10 characters)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = targetType === 'provider'
        ? `/admin/providers/${target._id}/ban`
        : `/admin/users/${target._id}/ban`;

      await api.post(endpoint, { reason: fullReason });
      onSuccess?.({ targetId: target._id, action: 'banned', reason: fullReason });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to suspend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bm-backdrop" onClick={onClose}>
      <div className="bm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="bm-header">
          <div className="bm-header-text">
            <h3>🚫 Suspend {targetType === 'provider' ? 'Provider' : 'User'}</h3>
            <p>This action is logged and reversible</p>
          </div>
          <button className="bm-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* ── Body ── */}
        <div className="bm-body">

          {/* Target card */}
          <div className="bm-target-card">
            <div className="bm-target-avatar">
              {target.name?.[0]?.toUpperCase()}
            </div>
            <div className="bm-target-info">
              <div className="bm-target-name">{target.name}</div>
              <div className="bm-target-email">{target.email}</div>
              {targetType === 'provider' && (
                <div className="bm-target-status">
                  <span>{target.verificationStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preset reasons */}
          <label className="bm-reason-label">Reason for suspension *</label>
          <div className="bm-reason-list">
            {PRESET_REASONS.map(r => (
              <label
                key={r}
                className={`bm-reason-option ${selectedReason === r ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="ban-reason"
                  value={r}
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {/* Custom note */}
          <div className="bm-note-section">
            <label className="bm-note-label">
              {selectedReason === 'Other (describe below)'
                ? 'Description *'
                : 'Additional notes (optional)'}
            </label>
            <textarea
              className="bm-note-textarea"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="Provide more context for this decision..."
              rows={3}
              maxLength={500}
            />
            <div className="bm-note-count">{customNote.length}/500</div>
          </div>

          {/* Warning */}
          <div className="bm-warning">
            <div className="bm-warning-title">⚠️ This action will:</div>
            <ul>
              <li>Immediately block the account from logging in</li>
              {targetType === 'provider' && <li>Deactivate the provider profile</li>}
              <li>Send an email notification to {target.email}</li>
              <li>Be recorded in the admin audit log</li>
            </ul>
          </div>

          {error && <div className="bm-error">{error}</div>}

          {/* Action buttons */}
          <div className="bm-actions">
            <button className="bm-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="bm-btn-suspend"
              onClick={handleBan}
              disabled={loading || !selectedReason || !isValid}
            >
              {loading
                ? '⏳ Suspending...'
                : `🚫 Suspend ${targetType === 'provider' ? 'Provider' : 'User'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BanModal;