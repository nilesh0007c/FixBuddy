import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
// import providerReducer from "./slices/providerSlice";
import chatReducer from "./slices/chatSlice";
import bargainReducer from "./slices/bargainSlice";
import chatbotReducer from "./slices/chatbotSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // provider: providerReducer,
    chat: chatReducer,
    bargain: bargainReducer,
    chatbot: chatbotReducer,
  },
});

export default store;
