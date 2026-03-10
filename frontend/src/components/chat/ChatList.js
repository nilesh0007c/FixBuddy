// frontend/src/components/chat/ChatList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import chatService from '../../services/chatService';
import './ChatList.css';

const ChatList = ({ onSelectChat, activeChatId }) => {
  const currentUser  = useSelector((s) => s.auth?.user);
  const onlineUsers  = useSelector((s) => s.chat?.onlineUsers || []);
  const unreadCounts = useSelector((s) => s.chat?.unreadCounts || {});

  const [chats,   setChats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const loadChats = useCallback(() => {
    setLoading(true);
    chatService.getAllChats()
      .then((data) => setChats(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  const getOther = (chat) =>
    chat.participants?.find(
      (p) =>
        p._id !== currentUser?._id &&
        p._id?.toString() !== currentUser?._id?.toString()
    ) || chat.participants?.[0];

  const filteredChats = chats.filter((chat) => {
    const other = getOther(chat);
    return other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (chat) => {
    const other = getOther(chat);
    onSelectChat?.(chat._id, other);
  };

  if (loading) return (
    <div className="cl-loading">
      <div className="cl-loading-spinner" />
      Loading conversations…
    </div>
  );

  return (
    <div className="cl-root">
      {/* Search */}
      <div className="cl-search-wrap">
        <span className="cl-search-icon">🔍</span>
        <input
          className="cl-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
        />
      </div>

      {/* List */}
      <div className="cl-list">
        {filteredChats.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty-icon">💬</div>
            <div className="cl-empty-title">No conversations yet</div>
            <div className="cl-empty-sub">
              Go to a booking and click <strong>Chat</strong> to start one.
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const other    = getOther(chat);
            const isActive = chat._id === activeChatId;
            const isOnline = onlineUsers.includes(other?._id) ||
                             onlineUsers.includes(other?._id?.toString());
            const unread   = unreadCounts[chat._id] || 0;
            const lastText = chat.lastMessage?.content ||
              (chat.lastMessage?.type !== 'text' ? '📎 Attachment' : 'Start a conversation…');
            const lastTime = chat.updatedAt
              ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            const name = other?.name || 'Unknown';
            const hue  = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

            return (
              <div key={chat._id} className={`cl-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(chat)}>

                {/* Avatar — hue is derived from name at runtime, kept inline */}
                <div className="cl-avatar-wrap">
                  <div className="cl-avatar"
                    style={{
                      background: isActive
                        ? `hsl(${hue},60%,88%)`
                        : `hsl(${hue},45%,88%)`,
                      color: `hsl(${hue},55%,35%)`,
                    }}>
                    {other?.avatar
                      ? <img src={other.avatar} alt="" />
                      : name[0]?.toUpperCase() || '?'}
                  </div>
                  {isOnline && <div className="cl-online-dot" />}
                </div>

                {/* Info */}
                <div className="cl-info">
                  <div className="cl-info-top">
                    <span className={`cl-name ${unread > 0 ? 'unread' : ''}`}>{name}</span>
                    <span className="cl-time">{lastTime}</span>
                  </div>
                  <div className={`cl-preview ${unread > 0 ? 'unread' : ''}`}>
                    {lastText}
                  </div>
                </div>

                {/* Badge */}
                {unread > 0 && (
                  <div className="cl-badge">{unread > 9 ? '9+' : unread}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;