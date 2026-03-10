// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
/* LoginPage uses global auth styles from App.css — no separate CSS needed */

const LoginPage = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === "admin")    navigate("/dashboard/admin");
      else if (user.role === "provider") navigate("/dashboard/provider");
      else navigate("/dashboard/user");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img className="logo" src="/logo.png" alt="FixBuddy Logo" />
        </div>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your LocalServe account</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
          >
            {loading ? "⏳ Signing in..." : "→ Login"}
          </button>
        </form>

        <div className="auth-footerl">
          <div>
            Don't have an account?<br />
            <Link to="/register">Sign up for free</Link>
          </div>
          <div>
            Forgot your password?<br />
            <Link to="/forgetpassword">Reset Password</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;