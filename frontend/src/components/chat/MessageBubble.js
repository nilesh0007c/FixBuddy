// src/components/chat/MessageBubble.jsx
import React, { memo, useState } from 'react';
import './MessageBubble.css';

const BASE_URL = (
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_SOCKET_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

/* ── Helpers ── */
function fmtSize(b) {
  if (!b) return '';
  if (b < 1024)    return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/**
 * Tries every known field name backends use for the file URL.
 * Returns the first absolute URL found, or constructs one from
 * a relative path using BASE_URL.
 */
function resolveUrl(att) {
  if (!att) return '';

  // Try all common field names in priority order
  const candidates = [
    att.fullUrl,       // custom full URL
    att.secure_url,    // Cloudinary
    att.Location,      // AWS S3
    att.url,           // generic
    att.fileUrl,       // some backends
    att.link,
    att.path,          // relative path from multer/diskStorage
    att.filename,      // sometimes just the filename
    att.originalName,  // last resort
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    if (raw.startsWith('http') || raw.startsWith('blob:')) return raw;
    // It's a relative path — prepend the base URL
    const sep = raw.startsWith('/') ? '' : '/';
    return `${BASE_URL}${sep}${raw}`;
  }

  return '';
}

function resolveFileType(att) {
  if (!att) return 'document';

  // Explicit fileType field
  const ft = att.fileType || '';
  if (ft && ft !== 'file') return ft;

  // MIME type
  const mime = att.mimetype || att.mimeType || att.type || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';

  // Extension fallback
  const ext = (att.originalName || att.fileName || att.filename || att.path || '')
    .split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','bmp','svg','avif'].includes(ext)) return 'image';
  if (['mp4','mov','avi','mkv','webm','flv'].includes(ext))               return 'video';
  if (['mp3','wav','ogg','m4a','aac','flac'].includes(ext))               return 'audio';

  return 'document';
}

/** Returns true if the attachment object has any URL-like field */
function hasAttachmentUrl(att) {
  if (!att) return false;
  return !!(
    att.fullUrl || att.secure_url || att.Location ||
    att.url     || att.fileUrl    || att.link     ||
    att.path    || att.filename
  );
}

const FILE_ICONS = { image: '🖼️', video: '🎬', audio: '🎵', document: '📄', file: '📎' };

/* ── Attachment Preview ── */
const AttachmentPreview = memo(({ att, isMine, onImageClick }) => {
  const [imgStatus, setImgStatus] = useState('loading');
  const url      = resolveUrl(att);
  const fileType = resolveFileType(att);
  const name     = att.originalName || att.fileName || att.filename || 'file';
  const size     = att.size || att.fileSize || 0;

  if (!url) return (
    <div className="file-img-error">
      <div>⚠️ No file URL found</div>
      <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: 4 }}>
        Keys: {Object.keys(att).join(', ')}
      </div>
    </div>
  );

  if (fileType === 'image') return (
    <div className="file-img-wrap">
      {imgStatus === 'loading' && <div className="file-img-skeleton">🖼️</div>}
      {imgStatus === 'error' && (
        <div className="file-img-error">
          <div>⚠️ Could not load image</div>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', wordBreak: 'break-all', marginTop: 4, display: 'block' }}>
            {url}
          </a>
        </div>
      )}
      <img
        src={url}
        alt={name}
        className="file-img"
        crossOrigin="anonymous"
        style={{ display: imgStatus === 'ok' ? 'block' : 'none' }}
        onLoad={() => setImgStatus('ok')}
        onError={() => setImgStatus('error')}
        onClick={() => imgStatus === 'ok' && onImageClick?.(url, name)}
      />
      {imgStatus === 'ok' && (
        <div className="file-img-label">{name}{size > 0 ? ` · ${fmtSize(size)}` : ''}</div>
      )}
    </div>
  );

  if (fileType === 'video') return (
    <div className="file-video">
      <video controls src={url} />
      <div className="file-video-label">{name}</div>
    </div>
  );

  if (fileType === 'audio') return (
    <div className="file-audio">
      <audio controls src={url} />
      <div className="file-audio-label">{name}</div>
    </div>
  );

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      className={`file-doc-link ${isMine ? 'mine' : 'theirs'}`}
    >
      <span className="file-doc-icon">{FILE_ICONS[fileType] || '📎'}</span>
      <div className="file-doc-info">
        <div className="file-doc-name">{name}</div>
        {size > 0 && <div className="file-doc-size">{fmtSize(size)}</div>}
      </div>
      <span className="file-doc-arrow">↓</span>
    </a>
  );
});

/* ── Message Bubble ── */
const MessageBubble = memo(({ message, isOwn, showAvatar = true, onReply, onDelete, onImageClick }) => {
  const hasAtt  = hasAttachmentUrl(message.attachment);
  const body    = message.content || message.text || '';
  const imgOnly = hasAtt && !body && resolveFileType(message.attachment) === 'image';

  const statusIcon = message.status?.seen
    ? <span className="msg-status-seen">✓✓</span>
    : message.status?.delivered
    ? <span className="msg-status-delivered">✓✓</span>
    : <span className="msg-status-sent">✓</span>;

  const senderName   = message.sender?.name || (isOwn ? 'You' : '?');
  const avatarLetter = senderName[0]?.toUpperCase() || '?';
  const hue          = [...senderName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div className={`msg-row ${isOwn ? 'mine' : 'theirs'}`}>

      {/* Avatar */}
      {!isOwn && (
        showAvatar
          ? <div className="msg-avatar" style={{ background: `hsl(${hue},50%,42%)` }}>
              {message.sender?.avatar
                ? <img src={message.sender.avatar} alt="" />
                : avatarLetter}
            </div>
          : <div className="msg-avatar-spacer" />
      )}

      <div className="msg-group">
        {/* Sender name */}
        {!isOwn && showAvatar && (
          <div className="msg-sender-name">{senderName}</div>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className="msg-reply-preview" onClick={() => onReply?.(message.replyTo)}>
            ↩ {message.replyTo.content?.substring(0, 80) || '[attachment]'}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`msg-bubble ${isOwn ? 'mine' : 'theirs'} ${message._optimistic ? 'optimistic' : ''} ${imgOnly ? 'image-only' : ''}`}
          onDoubleClick={() => onReply?.(message)}
        >
          {hasAtt && (
            <AttachmentPreview att={message.attachment} isMine={isOwn} onImageClick={onImageClick} />
          )}
          {body && (
            <div className={hasAtt ? 'bubble-body-below-att' : ''}>{body}</div>
          )}
          {isOwn && !message._optimistic && onDelete && (
            <button className="msg-delete-btn" onClick={() => onDelete(message._id)}>
              🗑 Delete
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="msg-meta">
          <span>
            {new Date(message.createdAt || message.sentAt).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          {message._optimistic && <span className="msg-sending-label">sending…</span>}
          {isOwn && !message._optimistic && statusIcon}
          {onReply && (
            <button className="msg-reply-btn" title="Reply" onClick={() => onReply(message)}>↩</button>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;