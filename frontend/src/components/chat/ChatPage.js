// frontend/src/components/chat/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ChatList    from './ChatList';
import ChatWindow  from './ChatWindow';
import chatService from '../../services/chatService';
import './ChatPage.css';

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const currentUser     = useSelector((s) => s.auth?.user);
  const onlineUsers     = useSelector((s) => s.chat?.onlineUsers || []);

  const [activeChatId,  setActiveChatId]  = useState(null);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [initLoading,   setInitLoading]   = useState(false);
  const [initError,     setInitError]     = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const withUserId = searchParams.get('with');
  const bookingRef = searchParams.get('booking');
  const nameHint   = searchParams.get('name');

  /* Auto-init from URL params */
  useEffect(() => {
    if (!withUserId) return;
    setInitLoading(true);
    setInitError('');
    chatService.initChat(withUserId, bookingRef)
      .then((res) => {
        const chat = res.data;
        setActiveChatId(chat._id);
        const other = chat.participants?.find(
          (p) =>
            p._id !== currentUser?._id &&
            p._id?.toString() !== currentUser?._id?.toString()
        );
        setRecipientInfo(other || { name: nameHint || 'User', _id: withUserId });
        navigate('/chat', { replace: true });
      })
      .catch((err) => {
        console.error('[ChatPage] initChat error:', err);
        setInitError('Could not open chat. Please try again.');
      })
      .finally(() => setInitLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId]);

  const handleSelectChat = (chatId, recipient) => {
    setActiveChatId(chatId);
    setRecipientInfo(recipient);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const isRecipientOnline = recipientInfo
    ? onlineUsers.includes(recipientInfo._id) ||
      onlineUsers.includes(recipientInfo._id?.toString())
    : false;

  return (
    <div className="cp-root">

      {/* Toggle button */}
      <button
        className={`cp-toggle-btn ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
      >
        <span className="cp-toggle-icon">◀</span>
        <span className="cp-toggle-label">
          {sidebarOpen ? 'Hide' : 'Chats'}
        </span>
      </button>

      {/* Sidebar */}
      <div className={`cp-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="cp-sidebar-header">
          <span className="cp-sidebar-icon">💬</span>
          <h2 className="cp-sidebar-title">Messages</h2>
        </div>
        <ChatList onSelectChat={handleSelectChat} activeChatId={activeChatId} />
      </div>

      {/* Main panel — paddingLeft is state-driven, kept inline */}
      <div className="cp-main" style={{ paddingLeft: sidebarOpen ? 16 : 52 }}>
        {initLoading ? (
          <div className="cp-loading-state">
            <div className="cp-loading-spinner" />
            Opening chat…
          </div>
        ) : initError ? (
          <div className="cp-error-state">{initError}</div>
        ) : activeChatId ? (
          <ChatWindow
            roomId={activeChatId}
            recipientName={recipientInfo?.name || 'User'}
            recipientAvatar={recipientInfo?.avatar}
            recipientOnline={isRecipientOnline}
          />
        ) : (
          <div className="cp-placeholder">
            <div className="cp-placeholder-icon">💬</div>
            <h3 className="cp-placeholder-title">No chat selected</h3>
            <p className="cp-placeholder-sub">
              Pick a conversation on the left, or go to a booking and click{' '}
              <span className="cp-placeholder-kbd">💬 Chat</span> to start a new one.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatPage;