// src/pages/auth/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    role: 'user', city: '', state: '', pincode: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const user = await register({
        name:     form.name,
        email:    form.email,
        phone:    form.phone,
        password: form.password,
        role:     form.role,
        city:     form.city,
        location: { city: form.city, state: form.state, pincode: form.pincode },
      });
      if (user.role === 'provider') navigate('/dashboard/provider');
      else navigate('/dashboard/user');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <img className="logo" src="/logo.png" alt="FixBuddy Logo" />
        </div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join the LocalServe marketplace today</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                name="name" type="text" value={form.name}
                onChange={handleChange} placeholder="John Doe" required
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                name="phone" type="tel" value={form.phone}
                onChange={handleChange} placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                name="password" type="password" value={form.password}
                onChange={handleChange} placeholder="Min 6 characters" required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                name="confirmPassword" type="password" value={form.confirmPassword}
                onChange={handleChange} placeholder="Repeat password" required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Register As</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="user">Customer (Looking for services)</option>
              <option value="provider">Service Provider</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                name="city" type="text" value={form.city}
                onChange={handleChange} placeholder="Mumbai"
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                name="state" type="text" value={form.state}
                onChange={handleChange} placeholder="Maharashtra"
              />
            </div>
            <div className="form-group">
              <label>Pincode</label>
              <input
                name="pincode" type="text" value={form.pincode}
                onChange={handleChange} placeholder="400001"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? '⏳ Creating account...' : '→ Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;