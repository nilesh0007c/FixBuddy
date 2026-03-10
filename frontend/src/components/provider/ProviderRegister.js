// src/pages/provider/ProviderRegister.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import '../../App.css';
import './ProviderRegister.css';

const FIELD_CONFIG = [
  ['name',       'Full Name *',         'text',   'John Doe'],
  ['phone',      'Phone Number *',      'text',   '+91 9876543210'],
  ['city',       'City *',              'text',   'Mumbai'],
  ['state',      'State',               'text',   'Maharashtra'],
  ['address',    'Address',             'text',   '123 Main Street'],
  ['hourlyRate', 'Hourly Rate (₹)',      'number', '500'],
  ['experience', 'Years of Experience', 'number', '2'],
];

export default function ProviderRegister() {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [liveFile,     setLiveFile]     = useState(null);
  const [idProofFile,  setIdProofFile]  = useState(null);
  const [livePreview,  setLivePreview]  = useState('');
  const [idPreview,    setIdPreview]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', services: '', description: '',
    city: '', state: '', address: '', hourlyRate: '', experience: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setError('Camera access denied. Please upload from gallery instead.');
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      setLiveFile(file);
      setLivePreview(URL.createObjectURL(blob));
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      setCameraActive(false);
    }, 'image/jpeg');
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (type === 'live')    { setLiveFile(file);    setLivePreview(preview); }
    if (type === 'idProof') { setIdProofFile(file); setIdPreview(preview); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!liveFile || !idProofFile) return setError('Both live image and ID proof are required');
    setLoading(true);
    setError('');

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    formData.append('liveImage',    liveFile);
    formData.append('idProofImage', idProofFile);

    try {
      await api.post('/providers/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/dashboard/provider', {
        state: { msg: 'Registration submitted! Awaiting admin verification.' },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-container-register">
      <div className="provider-register">
        <div className="auth-logo">
          <img className="logo" src="/logo.png" alt="FixBuddy Logo" />
        </div>

        <h1 className="provider-register-title">Register as Provider</h1>
        <p className="auth-subtitle">
          Submit your profile for admin review. You'll be live once verified.
        </p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Row: Name + Phone */}
          <div className="form-row">
            {FIELD_CONFIG.slice(0, 2).map(([name, label, type, placeholder]) => (
              <div className="form-group" key={name}>
                <label>{label}</label>
                <input
                  name={name} type={type} value={form[name]} onChange={handleChange}
                  placeholder={placeholder}
                  required={name === 'name' || name === 'phone'}
                />
              </div>
            ))}
          </div>

          {/* Row: City + State + Address */}
          <div className="form-row">
            {FIELD_CONFIG.slice(2, 5).map(([name, label, type, placeholder]) => (
              <div className="form-group" key={name}>
                <label>{label}</label>
                <input
                  name={name} type={type} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} required={name === 'city'}
                />
              </div>
            ))}
          </div>

          {/* Row: Hourly Rate + Experience */}
          <div className="form-row">
            {FIELD_CONFIG.slice(5).map(([name, label, type, placeholder]) => (
              <div className="form-group" key={name}>
                <label>{label}</label>
                <input
                  name={name} type={type} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} min="0"
                />
              </div>
            ))}
          </div>

          {/* Services */}
          <div className="form-group">
            <label>Services (comma separated) *</label>
            <input
              name="services" value={form.services} onChange={handleChange}
              placeholder="Plumber, Electrician, Painter" required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              rows="3" placeholder="Tell clients about yourself..."
            />
          </div>

          {/* ── Live Photo ── */}
          <div className="form-group">
            <label>Live Photo (Required)</label>
            <div className={`upload-zone ${livePreview ? 'has-file' : ''}`}>
              {!livePreview && !cameraActive && (
                <>
                  <div className="upload-icon">📸</div>
                  <p>Take a live selfie or upload from gallery</p>
                </>
              )}

              {cameraActive && (
                <div>
                  <video ref={videoRef} autoPlay className="camera-video" />
                  <button type="button" className="btn-outline btn-full" onClick={capturePhoto}>
                    📷 Capture Photo
                  </button>
                </div>
              )}

              {livePreview && (
                <img src={livePreview} alt="live selfie" className="live-preview-img" />
              )}
            </div>

            <div className="upload-actions">
              {!cameraActive && (
                <button type="button" className="btn-outline" onClick={startCamera}>
                  Open Camera
                </button>
              )}
              <label className="btn-outline upload-gallery-label">
                📁 Upload from Gallery
                <input type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'live')} />
              </label>
            </div>
          </div>

          {/* ── ID Proof ── */}
          <div className="form-group">
            <label>Government ID Proof (Required)</label>
            <p className="id-hint muted">Aadhar Card, PAN Card, or Driving License</p>
            <div className={`upload-zone ${idPreview ? 'has-file' : ''}`}>
              {!idPreview ? (
                <>
                  <div className="upload-icon">🪪</div>
                  <p>Upload your government ID</p>
                </>
              ) : (
                <img src={idPreview} alt="ID proof" className="id-preview-img" />
              )}
            </div>
            <label className="btn-outline upload-gallery-label">
              📁 Upload ID Proof
              <input type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'idProof')} />
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary btn-full btn-large"
            disabled={loading}
          >
            {loading ? '⏳ Submitting...' : '🚀 Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}