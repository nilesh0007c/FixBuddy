// frontend/src/services/chatbotService.js

import axios from 'axios';
import server from '../environment';

const API = axios.create({
  baseURL: `${server}/api/chatbot`,
  // NOTE: do NOT set Content-Type globally — axios sets it correctly for FormData
});

/* ── Attach auth token if present ── */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ─────────────────────────────────────────────────────────────────────
   sendMessage — plain text chat
───────────────────────────────────────────────────────────────────── */
const sendMessage = async ({ message, sessionId }) => {
  const payload = { message };
  if (sessionId) payload.sessionId = sessionId;

  const { data } = await API.post('/chat', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
};

/* ─────────────────────────────────────────────────────────────────────
   analyzeImage — multipart image upload → Claude vision analysis
   @param {File}   file
   @param {string} [note]      — optional user note about the image
   @param {string} [sessionId]
   @param {string} [city]      — for provider recommendation filtering
───────────────────────────────────────────────────────────────────── */
const analyzeImage = async ({ file, note = '', sessionId, city = '' }) => {
  const form = new FormData();
  form.append('image', file);
  if (note)      form.append('note',      note);
  if (sessionId) form.append('sessionId', sessionId);
  if (city)      form.append('city',      city);

  try {
    const { data } = await API.post('/analyze-image', form);
    return data;
  } catch (err) {
    // Extract the most useful error string for the Redux rejected payload
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error   ||
      err.message                 ||
      'Image analysis failed';
    const error = new Error(msg);
    error.status = err.response?.status;
    throw error;
  }
};

/* ─────────────────────────────────────────────────────────────────────
   escalate — hand off session to human agent
───────────────────────────────────────────────────────────────────── */
const escalate = async (sessionId) => {
  const { data } = await API.post(`/${sessionId}/escalate`);
  return data;
};

/* ─────────────────────────────────────────────────────────────────────
   rateSession — 1-5 star rating
───────────────────────────────────────────────────────────────────── */
const rateSession = async (sessionId, rating) => {
  const { data } = await API.post('/rate', { sessionId, rating }, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
};

/* ─────────────────────────────────────────────────────────────────────
   getProviders — fetch providers by category + city
───────────────────────────────────────────────────────────────────── */
const getProviders = async ({ category, city = '', limit = 4 }) => {
  const { data } = await API.post('/providers', { category, city, limit }, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
};

const chatbotService = {
  sendMessage,
  analyzeImage,
  escalate,
  rateSession,
  getProviders,
};

export default chatbotService;