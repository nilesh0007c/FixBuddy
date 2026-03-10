import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import chatbotService from "../../services/chatbotService";

const initialState = {
  messages: [
    {
      role: "assistant",
      content: "Hi 👋 How can I help you today?",
    },
  ],
  loading: false,
  isOpen: false,
  sessionId: null,
};

export const sendChatbotMessage = createAsyncThunk(
  "chatbot/sendMessage",
  async ({ message, sessionId }, thunkAPI) => {
    try {
      const response = await chatbotService.sendMessage({
        message,
        sessionId,
      });
      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || "Something went wrong"
      );
    }
  }
);

const chatbotSlice = createSlice({
  name: "chatbot",
  initialState,
  reducers: {
    toggleChatbot: (state) => {
      state.isOpen = !state.isOpen;
    },
    clearSession: (state) => {
      state.messages = [
        {
          role: "assistant",
          content: "Hi 👋 How can I help you today?",
        },
      ];
      state.sessionId = null;
    },
    addUserMessage: (state, action) => {
      state.messages.push({
        role: "user",
        content: action.payload,
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatbotMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendChatbotMessage.fulfilled, (state, action) => {
        state.loading = false;

        state.messages.push({
          role: "assistant",
          content: action.payload.reply,
        });

        if (action.payload.sessionId) {
          state.sessionId = action.payload.sessionId;
        }
      })
      .addCase(sendChatbotMessage.rejected, (state, action) => {
        state.loading = false;
        state.messages.push({
          role: "assistant",
          content: "⚠️ Server error. Please try again.",
        });
      });
  },
});

export const { toggleChatbot, clearSession, addUserMessage } =
  chatbotSlice.actions;

export default chatbotSlice.reducer;