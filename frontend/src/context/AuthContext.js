import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://fixbuddyfrontend.onrender.com';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token,   setToken]   = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  // ── Persist to localStorage whenever user/token changes ──
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else       localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else      localStorage.removeItem('user');
  }, [user]);

  // ── Login ──────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Register (normal user) ─────────────────────────────────
  const register = async (name, email, password, phone) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/register`, { name, email, password, phone });
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh user from DB ───────────────────────────────────
  // Call this after any action that changes the user's role in the DB
  // e.g. after successfully submitting the provider registration form
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data.user);   // role is now 'provider' after registerProvider ran
    } catch {
      // token may have expired — log out silently
      logout();
    }
  }, [token]);

  // ── Logout ─────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
