import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import chatService from '../../services/chatService';

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async ({ chatId, page }, { rejectWithValue }) => {
    try   { return await chatService.getMessages(chatId, page); }
    catch (err) { return rejectWithValue(err.response?.data?.error); }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    activeChats:  {},   // { [chatId]: { messages: [], page: 1 } }
    activeChatId: null,
    typingUsers:  {},   // { [chatId]: [userId, ...] }
    onlineUsers:  [],
    unreadCounts: {}
  },
  reducers: {
    setActiveChatId: (state, { payload }) => {
      state.activeChatId = payload;
    },
    addMessage: (state, { payload: { chatId, message } }) => {
      if (!state.activeChats[chatId])
        state.activeChats[chatId] = { messages: [], page: 1 };
      state.activeChats[chatId].messages.push(message);
    },
    setTyping: (state, { payload: { chatId, userId, isTyping } }) => {
      if (!state.typingUsers[chatId]) state.typingUsers[chatId] = [];
      if (isTyping)
        state.typingUsers[chatId] = [...new Set([...state.typingUsers[chatId], userId])];
      else
        state.typingUsers[chatId] = state.typingUsers[chatId].filter(id => id !== userId);
    },
    setUserOnline:  (state, { payload }) => { if (!state.onlineUsers.includes(payload)) state.onlineUsers.push(payload); },
    setUserOffline: (state, { payload }) => { state.onlineUsers = state.onlineUsers.filter(id => id !== payload); },
  },
  extraReducers: builder => {
    builder.addCase(fetchChatHistory.fulfilled, (state, { payload: { chatId, messages, page } }) => {
      if (!state.activeChats[chatId]) state.activeChats[chatId] = { messages: [], page: 1 };
      state.activeChats[chatId].messages =
        page === 1 ? messages : [...messages, ...state.activeChats[chatId].messages];
      state.activeChats[chatId].page = page;
    });
  }
});

export const { setActiveChatId, addMessage, setTyping, setUserOnline, setUserOffline } = chatSlice.actions;
export default chatSlice.reducer;