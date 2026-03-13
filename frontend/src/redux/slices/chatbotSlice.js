// frontend/src/redux/slices/chatbotSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import chatbotService from '../../services/chatbotService';

/* ─────────────────────────────────────────────────────────────────────
   Initial state
───────────────────────────────────────────────────────────────────── */
const initialState = {
  messages:  [{ role: 'assistant', content: 'Hi 👋 How can I help you today?' }],
  loading:   false,
  isOpen:    false,
  sessionId: null,

  // Image analysis
  analyzing:  false,
  lastAnalysis: null,   // { analysis, videos, providers }
};

/* ─────────────────────────────────────────────────────────────────────
   Thunks
───────────────────────────────────────────────────────────────────── */

/** Send a plain-text message */
export const sendChatbotMessage = createAsyncThunk(
  'chatbot/sendMessage',
  async ({ message, sessionId }, { rejectWithValue }) => {
    try {
      return await chatbotService.sendMessage({ message, sessionId });
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Something went wrong');
    }
  }
);

/** Upload & analyse an image */
export const analyzeImage = createAsyncThunk(
  'chatbot/analyzeImage',
  async ({ file, note, sessionId, city }, { rejectWithValue }) => {
    try {
      return await chatbotService.analyzeImage({ file, note, sessionId, city });
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Image analysis failed'
      );
    }
  }
);

/* ─────────────────────────────────────────────────────────────────────
   Slice
───────────────────────────────────────────────────────────────────── */
const chatbotSlice = createSlice({
  name: 'chatbot',
  initialState,
  reducers: {
    toggleChatbot:  (state) => { state.isOpen = !state.isOpen; },

    clearSession: (state) => {
      state.messages    = [{ role: 'assistant', content: 'Hi 👋 How can I help you today?' }];
      state.sessionId   = null;
      state.lastAnalysis = null;
    },

    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload });
    },

    /** Push a rich message object (for image analysis results) */
    addRichMessage: (state, action) => {
      state.messages.push(action.payload);
    },
  },

  extraReducers: (builder) => {

    /* ── Text chat ── */
    builder
      .addCase(sendChatbotMessage.pending, (state) => { state.loading = true; })
      .addCase(sendChatbotMessage.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.messages.push({ role: 'assistant', content: payload.reply });
        if (payload.sessionId) state.sessionId = payload.sessionId;
      })
      .addCase(sendChatbotMessage.rejected, (state) => {
        state.loading = false;
        state.messages.push({ role: 'assistant', content: '⚠️ Server error. Please try again.' });
      });

    /* ── Image analysis ── */
    builder
      .addCase(analyzeImage.pending, (state) => { state.analyzing = true; })
      .addCase(analyzeImage.fulfilled, (state, { payload }) => {
        state.analyzing = false;
        if (payload.sessionId) state.sessionId = payload.sessionId;

        // Store rich data for rendering
        state.lastAnalysis = {
          analysis:  payload.analysis,
          videos:    payload.videos,
          providers: payload.providers,
        };

        // Push a rich-type message; widget renders it specially
        state.messages.push({
          role:      'assistant',
          type:      'image_analysis',
          content:   payload.reply,
          analysis:  payload.analysis,
          videos:    payload.videos,
          providers: payload.providers,
        });
      })
      .addCase(analyzeImage.rejected, (state, { payload }) => {
        state.analyzing = false;
        const msg = typeof payload === 'string'
          ? payload
          : payload?.message || 'Image analysis failed. Please try again.';
        state.messages.push({ role: 'assistant', content: `⚠️ ${msg}` });
      });
  },
});

export const { toggleChatbot, clearSession, addUserMessage, addRichMessage } = chatbotSlice.actions;
export default chatbotSlice.reducer;