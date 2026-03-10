// frontend/src/services/chatService.js

import api from "../api/axiosInstance";

const getAllChats = async () => {
  const res = await api.get("/chat");
  return res.data;
};

const initChat = async (providerId, bookingRef = null) => {
  const res = await api.post("/chat/init", { providerId, bookingRef });
  return res.data;
};

const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/chat/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Works with ALL call shapes:
 *   { chatId, content }          ← new / correct
 *   { roomId, text }             ← ChatWindow.js legacy
 *   { chatId, text }             ← mixed
 */
const sendMessage = async ({
  chatId, roomId,
  content, text,
  type = "text",
  replyTo = null,
  attachment = null,
}) => {
  const id   = chatId  || roomId   || null;
  const body = content || text     || "";
  const res  = await api.post("/chat/message", {
    chatId: id,
    content: body,
    type,
    replyTo,
    attachment,
  });
  return res.data;
};

const getMessages = async (chatIdOrRoomId, page = 1, limit = 50) => {
  const res = await api.get(`/chat/${chatIdOrRoomId}/messages`, {
    params: { page, limit },
  });
  return res.data;
};

const markRead = async (chatIdOrRoomId) => {
  const res = await api.patch(`/chat/${chatIdOrRoomId}/read`);
  return res.data;
};

const deleteMessage = async (messageId) => {
  const res = await api.delete(`/chat/message/${messageId}`);
  return res.data;
};

// ── default export (used by ChatList, ChatPage) ──
const chatService = {
  getAllChats,
  initChat,
  uploadFile,
  sendMessage,
  getMessages,
  markRead,
  deleteMessage,
};

export default chatService;

// ── named exports (used by ChatWindow via `import * as chatSvc`) ──
export {
  getAllChats,
  initChat,
  uploadFile,
  sendMessage,   // ← same function, accepts roomId/text too
  getMessages,
  markRead,
  deleteMessage,
};