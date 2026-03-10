import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setTyping, setUserOnline, setUserOffline, fetchChatHistory } from '../redux/slices/chatSlice';
import useSocket  from './useSocket';
import chatService from "../services/chatService";

export const useChat = (chatId) => {
  const dispatch    = useDispatch();
  const { emit, on } = useSocket();
  const typingTimer  = useRef(null);
  const { activeChats, typingUsers, onlineUsers } = useSelector(s => s.chat);
  const currentChat  = activeChats[chatId];

  // Register socket listeners for this chat
  useEffect(() => {
    if (!chatId) return;

    const offMessage = on('chat:new_message', msg => {
      if (msg.chatId === chatId) dispatch(addMessage({ chatId, message: msg }));
    });
    const offTyping = on('chat:user_typing', data => {
      if (data.chatId === chatId) dispatch(setTyping(data));
    });
    const offOnline  = on('chat:user_online',  ({ userId }) => dispatch(setUserOnline(userId)));
    const offOffline = on('chat:user_offline', ({ userId }) => dispatch(setUserOffline(userId)));
    const offSeen    = on('chat:messages_seen', data => {
      // You can dispatch a seen update action here
    });

    return () => { offMessage(); offTyping(); offOnline(); offOffline(); offSeen(); };
  }, [chatId, on, dispatch]);

  // Load initial messages
  useEffect(() => {
    if (chatId) dispatch(fetchChatHistory({ chatId, page: 1 }));
  }, [chatId, dispatch]);

  const sendMessage = useCallback((content, type = 'text', replyTo = null) => {
    emit('chat:send_message', { chatId, content, type, replyTo }, ack => {
      if (ack?.error) console.error('[Chat] Send error:', ack.error);
    });
  }, [chatId, emit]);

  const sendFile = useCallback(async (file) => {
    const { fileUrl, fileName, fileSize } = await chatService.uploadFile(file);
    emit('chat:send_message', { chatId, content: fileUrl, type: 'file', fileUrl, fileName, fileSize });
  }, [chatId, emit]);

  const startTyping = useCallback(() => {
    emit('chat:typing_start', { chatId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emit('chat:typing_stop', { chatId }), 3000);
  }, [chatId, emit]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    emit('chat:typing_stop', { chatId });
  }, [chatId, emit]);

  const markSeen = useCallback((messageIds) => {
    emit('chat:mark_seen', { chatId, messageIds });
  }, [chatId, emit]);

  const loadMore = useCallback(() => {
    if (currentChat?.page) dispatch(fetchChatHistory({ chatId, page: currentChat.page + 1 }));
  }, [chatId, currentChat, dispatch]);

  return {
    messages:     currentChat?.messages || [],
    typingUsers:  typingUsers[chatId]   || [],
    onlineUsers,
    sendMessage,
    sendFile,
    startTyping,
    stopTyping,
    markSeen,
    loadMore
  };
};