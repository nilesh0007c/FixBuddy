// frontend/src/pages/ForgotPasswordPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import './ForgotPasswordPage.css';

/* ── Step keys ── */
const STEP = { EMAIL: 'email', OTP: 'otp', RESET: 'reset', DONE: 'done' };

/* ── Password strength checker ── */
const checkStrength = (p) => {
  const rules = [
    { test: p.length >= 8,              label: '8+ characters' },
    { test: /[A-Z]/.test(p),            label: 'Uppercase letter' },
    { test: /[a-z]/.test(p),            label: 'Lowercase letter' },
    { test: /[0-9]/.test(p),            label: 'Number' },
    { test: /[@$!%*?&#^]/.test(p),      label: 'Special char (@$!%*?&#^)' },
  ];
  const passed = rules.filter(r => r.test).length;
  return { rules, score: passed, strong: passed === 5 };
};

/* ── OTP countdown hook ── */
const useCountdown = (initial = 0) => {
  const [secs, setSecs] = useState(initial);
  const timer = useRef(null);

  const start = (s) => {
    setSecs(s);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) { clearInterval(timer.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timer.current), []);
  return { secs, start };
};

/* ── Strength fill color ── */
const STRENGTH_COLORS = ['#E5E7EB', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#16A34A'];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step,       setStep]       = useState(STEP.EMAIL);
  const [email,      setEmail]      = useState('');
  const [otp,        setOtp]        = useState(['', '', '', '', '', '']);
  const otpRefs                     = useRef([]);
  const [resetToken, setResetToken] = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [info,       setInfo]       = useState('');
  const { secs, start } = useCountdown(0);
  const otpString = otp.join('');

  /* ── OTP handlers ── */
  const handleOtpKey = (i, e) => {
    const val  = e.target.value.replace(/\D/g, '');
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  /* ── Step 1: request OTP ── */
  const submitEmail = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
      return setError('Please enter a valid email address.');
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.toLowerCase() });
      setInfo(`OTP sent to ${email}. Check your inbox (and spam folder).`);
      start(600);
      setStep(STEP.OTP);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── Step 2: verify OTP ── */
  const submitOtp = async () => {
    if (otpString.length !== 6) return setError('Please enter all 6 digits.');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: otpString });
      setResetToken(data.resetToken);
      setInfo('OTP verified! Now set your new password.');
      setStep(STEP.RESET);
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid or expired OTP.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  /* ── Step 3: reset password ── */
  const submitReset = async () => {
    const { strong } = checkStrength(password);
    if (!strong)              return setError('Password does not meet all requirements.');
    if (password !== confirm) return setError('Passwords do not match.');
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, resetToken, newPassword: password });
      setStep(STEP.DONE);
    } catch (e) {
      setError(e.response?.data?.message || 'Reset failed. Please start over.');
    } finally { setLoading(false); }
  };

  /* ── Resend OTP ── */
  const resendOtp = async () => {
    if (secs > 0) return;
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setInfo('New OTP sent!');
      start(600);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to resend OTP.');
    } finally { setLoading(false); }
  };

  /* ── Progress ── */
  const stepsOrder = [STEP.EMAIL, STEP.OTP, STEP.RESET];
  const stepIdx    = stepsOrder.indexOf(step);

  const pw              = checkStrength(password);
  const strengthColor   = STRENGTH_COLORS[pw.score];

  return (
    <div className="fp-page">
      <div className="fp-card">

        {/* ── Header ── */}
        <div className="fp-header">
          <h1 className="fp-header-logo">
            <img className="logo" src="/logo.png" alt="FixBuddy Logo" />
          </h1>
          <p className="fp-header-sub">
            {step === STEP.EMAIL && 'Reset your password'}
            {step === STEP.OTP   && 'Verify your identity'}
            {step === STEP.RESET && 'Create new password'}
            {step === STEP.DONE  && 'All done!'}
          </p>
        </div>

        {/* ── Progress bar ── */}
        {step !== STEP.DONE && (
          <div className="fp-progress">
            {stepsOrder.map((s, i) => (
              <div
                key={s}
                className={`fp-progress-step ${i <= stepIdx ? 'done' : 'pending'}`}
              />
            ))}
          </div>
        )}

        <div className="fp-body">

          {/* ══ STEP 1: Email ══ */}
          {step === STEP.EMAIL && (
            <>
              <h3 className="fp-step-title">Forgot your password?</h3>
              <p className="fp-step-sub">
                Enter your registered email and we'll send you a 6-digit OTP.
              </p>
              {error && <div className="fp-alert error">⚠️ {error}</div>}
              <label className="fp-label">Email Address</label>
              <input
                type="email"
                className="fp-input"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                onKeyDown={e => e.key === 'Enter' && submitEmail()}
                autoFocus
              />
              <button
                className="fp-btn primary"
                onClick={submitEmail}
                disabled={loading || !email}
              >
                {loading ? '⏳ Sending OTP...' : 'Send OTP →'}
              </button>
              <p className="fp-back-link">
                <Link to="/login">← Back to Login</Link>
              </p>
            </>
          )}

          {/* ══ STEP 2: OTP ══ */}
          {step === STEP.OTP && (
            <>
              <h3 className="fp-step-title">Enter 6-digit OTP</h3>
              <p className="fp-step-sub">
                Sent to <strong>{email}</strong>.{' '}
                {secs > 0 ? (
                  <span className="fp-timer">
                    Expires in {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="fp-timer expired">OTP may have expired.</span>
                )}
              </p>
              {info  && <div className="fp-alert success">✅ {info}</div>}
              {error && <div className="fp-alert error">⚠️ {error}</div>}

              <div className="fp-otp-row" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    className={`fp-otp-input ${digit ? 'has-value' : ''}`}
                    onChange={e => handleOtpKey(i, e)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                className="fp-btn primary"
                onClick={submitOtp}
                disabled={loading || otpString.length !== 6}
              >
                {loading ? '⏳ Verifying...' : 'Verify OTP →'}
              </button>

              <div className="fp-otp-actions">
                <button
                  className="fp-ghost-btn"
                  onClick={() => { setStep(STEP.EMAIL); setError(''); setOtp(['','','','','','']); }}
                >
                  ← Change email
                </button>
                <button
                  className={`fp-ghost-btn orange`}
                  onClick={resendOtp}
                  disabled={secs > 0}
                >
                  {secs > 0 ? `Resend in ${secs}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}

          {/* ══ STEP 3: New Password ══ */}
          {step === STEP.RESET && (
            <>
              <h3 className="fp-step-title">Set new password</h3>
              {info  && <div className="fp-alert success">✅ {info}</div>}
              {error && <div className="fp-alert error">⚠️ {error}</div>}

              <label className="fp-label">New Password</label>
              <div className="fp-pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="fp-input"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  className="fp-pw-toggle"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>

              {/* Strength meter */}
              {password && (
                <div className="fp-strength-wrap">
                  <div className="fp-strength-track">
                    <div
                      className="fp-strength-fill"
                      style={{
                        width:      `${(pw.score / 5) * 100}%`,
                        background: strengthColor,
                      }}
                    />
                  </div>
                  <div className="fp-strength-rules">
                    {pw.rules.map(r => (
                      <span key={r.label} className={`fp-rule-tag ${r.test ? 'pass' : 'fail'}`}>
                        {r.test ? '✓' : '✗'} {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <label className="fp-label">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fp-input ${confirm && confirm !== password ? 'error' : ''}`}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="Repeat password"
                style={{ marginBottom: 16 }}
                onKeyDown={e => e.key === 'Enter' && submitReset()}
              />
              {confirm && confirm !== password && (
                <div className="fp-mismatch-note">⚠️ Passwords do not match</div>
              )}

              <button
                className="fp-btn primary"
                onClick={submitReset}
                disabled={loading || !pw.strong || password !== confirm}
              >
                {loading ? '⏳ Resetting...' : '🔒 Reset Password'}
              </button>
            </>
          )}

          {/* ══ STEP 4: Done ══ */}
          {step === STEP.DONE && (
            <div className="fp-done">
              <div className="fp-done-emoji">🎉</div>
              <h3 className="fp-done-title">Password Reset!</h3>
              <p className="fp-done-sub">
                Your password has been updated. You can now log in with your new password.
              </p>
              <button className="fp-btn success-btn" onClick={() => navigate('/login')}>
                Go to Login →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}