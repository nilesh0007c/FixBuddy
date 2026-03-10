import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosInstance';
import axios from "axios";

export const loginUser = createAsyncThunk('auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('token', data.token);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk('auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      localStorage.setItem('token', data.token);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadCurrentUser = createAsyncThunk('auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    null,
    token:   localStorage.getItem('token'),
    loading: false,
    error:   null,
  },
  reducers: {
    logout: (state) => {
      state.user  = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    setUser: (state, action) => { state.user = action.payload; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending,   (s)   => { s.loading = true;  s.error = null; })
      .addCase(loginUser.fulfilled, (s,a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; })
      .addCase(loginUser.rejected,  (s,a) => { s.loading = false; s.error = a.payload; })
      .addCase(registerUser.pending,   (s)   => { s.loading = true;  s.error = null; })
      .addCase(registerUser.fulfilled, (s,a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; })
      .addCase(registerUser.rejected,  (s,a) => { s.loading = false; s.error = a.payload; })
      .addCase(loadCurrentUser.fulfilled, (s,a) => { s.user = a.payload; });
  },
});

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, thunkAPI) => {
    try {
      const response = await axios.post("/auth/refresh-token");
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const { logout, setUser, clearError } = authSlice.actions;
export default authSlice.reducer;