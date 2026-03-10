import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/chatbot",
  headers: {
    "Content-Type": "application/json",
  },
});

const sendMessage = async (data) => {
  // const response = await API.post("/chat", {
  //   message: data.message,
  //   sessionId: data.sessionId || null,
  // }
  const payload = {
  message: data.message,
};

if (data.sessionId) {
  payload.sessionId = data.sessionId;
}

const response = await API.post("/chat", payload);

  return response.data;
};

const escalate = async (sessionId) => {
  const response = await API.post("/escalate", { sessionId });
  return response.data;
};

const rateSession = async (sessionId, rating) => {
  const response = await API.post("/rate", {
    sessionId,
    rating,
  });
  return response.data;
};

const chatbotService = {
  sendMessage,
  escalate,
  rateSession,
};

export default chatbotService;