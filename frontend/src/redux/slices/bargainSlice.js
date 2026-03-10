// frontend/src/redux/slices/bargainSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosInstance';

/* ─── Thunks ─── */

export const fetchNegotiation = createAsyncThunk(
  'bargain/fetch',
  async (negotiationId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bargain/${negotiationId}`);
      return data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to load negotiation');
    }
  }
);

export const fetchByBooking = createAsyncThunk(
  'bargain/fetchByBooking',
  async (bookingId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bargain/booking/${bookingId}`);
      return data.data;           // may be null
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to load negotiation');
    }
  }
);

export const initNegotiation = createAsyncThunk(
  'bargain/init',
  async ({ bookingId, initialOffer, message }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/bargain/init', { bookingId, initialOffer, message });
      return data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to start negotiation');
    }
  }
);

export const submitOffer = createAsyncThunk(
  'bargain/counter',
  async ({ negotiationId, amount, message }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/bargain/${negotiationId}/counter`, { amount, message });
      return data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Counter-offer failed');
    }
  }
);

export const acceptOffer = createAsyncThunk(
  'bargain/accept',
  async (negotiationId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/bargain/${negotiationId}/accept`);
      return data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Accept failed');
    }
  }
);

export const rejectOffer = createAsyncThunk(
  'bargain/reject',
  async (negotiationId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/bargain/${negotiationId}/reject`);
      return data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Reject failed');
    }
  }
);

export const fetchSuggestion = createAsyncThunk(
  'bargain/suggest',
  async (negotiationId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bargain/${negotiationId}/suggest`);
      return data.suggested;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Suggestion failed');
    }
  }
);

/* ─── Slice ─── */
const bargainSlice = createSlice({
  name: 'bargain',
  initialState: {
    current:    null,
    suggestion: null,
    loading:    false,
    error:      null,
  },
  reducers: {
    clearNegotiation: (state) => {
      state.current    = null;
      state.suggestion = null;
      state.error      = null;
    },
    patchNegotiation: (state, action) => {
      if (state.current?._id === action.payload._id)
        state.current = { ...state.current, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    const setLoading = (s) => { s.loading = true; s.error = null; };
    const setError   = (s, a) => { s.loading = false; s.error = a.payload; };
    const setData    = (s, a) => { s.loading = false; s.current = a.payload; };

    builder
      .addCase(fetchNegotiation.pending,   setLoading)
      .addCase(fetchNegotiation.fulfilled, setData)
      .addCase(fetchNegotiation.rejected,  setError)

      .addCase(fetchByBooking.pending,     setLoading)
      .addCase(fetchByBooking.fulfilled,   setData)
      .addCase(fetchByBooking.rejected,    setError)

      .addCase(initNegotiation.pending,    setLoading)
      .addCase(initNegotiation.fulfilled,  setData)
      .addCase(initNegotiation.rejected,   setError)

      .addCase(submitOffer.pending,        setLoading)
      .addCase(submitOffer.fulfilled,      setData)
      .addCase(submitOffer.rejected,       setError)

      .addCase(acceptOffer.pending,        setLoading)
      .addCase(acceptOffer.fulfilled,      setData)
      .addCase(acceptOffer.rejected,       setError)

      .addCase(rejectOffer.pending,        setLoading)
      .addCase(rejectOffer.fulfilled,      setData)
      .addCase(rejectOffer.rejected,       setError)

      .addCase(fetchSuggestion.fulfilled,  (s, a) => { s.suggestion = a.payload; });
  },
});

export const { clearNegotiation, patchNegotiation } = bargainSlice.actions;
export default bargainSlice.reducer;