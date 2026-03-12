// src/pages/provider/ProviderRegister.jsx
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import "../../App.css";
import "./ProviderRegister.css";

const FIELD_CONFIG = [
  ["name",       "Full Name *",          "text",   "John Doe"],
  ["phone",      "Phone Number *",       "text",   "+91 9876543210"],
  ["city",       "City *",               "text",   "Mumbai"],
  ["state",      "State",                "text",   "Maharashtra"],
  ["address",    "Address",              "text",   "123 Main Street"],
  ["hourlyRate", "Default Hourly Rate (₹)", "number", "500"],
  ["experience", "Years of Experience",  "number", "2"],
];

const PRICE_UNITS = ["hour", "day", "job"];

const emptyService = () => ({ name: "", category: "", description: "", price: "", priceUnit: "hour" });

export default function ProviderRegister() {
  const navigate  = useNavigate();
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [liveFile,     setLiveFile]     = useState(null);
  const [idProofFile,  setIdProofFile]  = useState(null);
  const [livePreview,  setLivePreview]  = useState("");
  const [idPreview,    setIdPreview]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", description: "",
    city: "", state: "", address: "", hourlyRate: "", experience: "",
  });

  // Services as structured array — price is a first-class field
  const [services, setServices] = useState([emptyService()]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ── Service row handlers ──────────────────────────────────────
  const updateService = (idx, field, value) =>
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const addService    = () => setServices(prev => [...prev, emptyService()]);
  const removeService = (idx) => setServices(prev => prev.filter((_, i) => i !== idx));

  // ── Camera ────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied."
          : "Unable to access camera. Please upload from gallery."
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      setLiveFile(file);
      setLivePreview(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
    }, "image/jpeg");
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (type === "live")    { setLiveFile(file);    setLivePreview(preview); }
    if (type === "idProof") { setIdProofFile(file); setIdPreview(preview);   }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate services
    const validServices = services.filter(s => s.name.trim());
    if (validServices.length === 0) {
      setError("Please add at least one service with a name.");
      return;
    }
    const missingPrice = validServices.find(s => s.price === "" || isNaN(Number(s.price)));
    if (missingPrice) {
      setError(`Please enter a valid price for service: "${missingPrice.name}"`);
      return;
    }

    if (!liveFile || !idProofFile) {
      setError("Both live image and ID proof are required.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();

    // Append scalar fields
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));

    // Append services as a JSON string — backend will parse it
    const servicesPayload = validServices.map(s => ({
      name:        s.name.trim(),
      category:    (s.category || s.name).trim(),
      description: s.description.trim(),
      price:       Number(s.price),
      priceUnit:   s.priceUnit,
    }));
    formData.append("services", JSON.stringify(servicesPayload));

    formData.append("liveImage",    liveFile);
    formData.append("idProofImage", idProofFile);

    try {
      await api.post("/providers/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/dashboard/provider", {
        state: { msg: "Registration submitted! Awaiting admin verification." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-container-register">
      <div className="provider-register">

        <h1 className="provider-register-title">Register as Provider</h1>
        <p className="provider-register-subtitle">
          Fill in your details to get started. Your profile will be reviewed by our team.
        </p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="provider-register-form">

          {/* ── Basic fields ── */}
          <div className="form-grid">
            {FIELD_CONFIG.map(([name, label, type, placeholder]) => (
              <div className="form-group" key={name}>
                <label className="form-label">{label}</label>
                <input
                  className="form-input"
                  name={name} type={type}
                  value={form[name]} onChange={handleChange}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>

          <div className="form-group form-group--full">
            <label className="form-label">Description</label>
            <textarea
              className="form-input form-textarea"
              name="description" value={form.description}
              onChange={handleChange}
              placeholder="Describe your skills and experience…"
            />
          </div>

          {/* ── Services section ── */}
          <div className="form-section-divider"><span>Services & Pricing</span></div>

          <div className="form-group form-group--full">
            <label className="form-label" style={{ marginBottom: "0.75rem" }}>
              Services Offered *
            </label>

            {services.map((svc, idx) => (
              <div key={idx} className="service-row">
                <div className="service-row-inputs">
                  <input
                    className="form-input"
                    placeholder="Service name *"
                    value={svc.name}
                    onChange={e => updateService(idx, "name", e.target.value)}
                  />
                  <input
                    className="form-input"
                    placeholder="Category (e.g. Plumbing)"
                    value={svc.category}
                    onChange={e => updateService(idx, "category", e.target.value)}
                  />
                  <div className="service-price-group">
                    <span className="service-price-prefix">₹</span>
                    <input
                      className="form-input service-price-input"
                      type="number"
                      placeholder="Price *"
                      min="0"
                      value={svc.price}
                      onChange={e => updateService(idx, "price", e.target.value)}
                    />
                    <select
                      className="form-input service-unit-select"
                      value={svc.priceUnit}
                      onChange={e => updateService(idx, "priceUnit", e.target.value)}
                    >
                      {PRICE_UNITS.map(u => <option key={u} value={u}>/{u}</option>)}
                    </select>
                  </div>
                  <input
                    className="form-input"
                    placeholder="Short description (optional)"
                    value={svc.description}
                    onChange={e => updateService(idx, "description", e.target.value)}
                  />
                </div>
                {services.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-remove-service"
                    onClick={() => removeService(idx)}
                    title="Remove service"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="btn btn-add-service" onClick={addService}>
              + Add Another Service
            </button>
          </div>

          {/* ── Identity verification ── */}
          <div className="form-section-divider"><span>Identity Verification</span></div>

          {/* Live selfie */}
          <div className="form-group form-group--full">
            <label className="form-label">Live Selfie</label>

            {cameraActive && (
              <div className="camera-wrapper">
                <video ref={videoRef} autoPlay playsInline className="camera-video" />
                <button type="button" className="btn btn-capture" onClick={capturePhoto}>
                  📸 Capture Photo
                </button>
              </div>
            )}

            {livePreview && (
              <div className="preview-wrapper">
                <img src={livePreview} alt="Selfie preview" className="live-preview-img" />
                <span className="preview-badge">✔ Selfie captured</span>
              </div>
            )}

            <div className="upload-actions">
              <button type="button" className="btn btn-camera" onClick={startCamera}>
                📷 Open Camera
              </button>
              <label className="btn btn-gallery">
                📁 Upload from Gallery
                <input type="file" accept="image/*" capture="user" hidden
                  onChange={e => handleFileChange(e, "live")} />
              </label>
            </div>
          </div>

          {/* ID proof */}
          <div className="form-group form-group--full">
            <label className="form-label">ID Proof</label>
            <p className="id-hint">
              Upload a clear photo of a government-issued ID — Aadhaar, PAN, Passport, or Voter ID.
            </p>

            {idPreview && (
              <div className="preview-wrapper">
                <img src={idPreview} alt="ID proof preview" className="id-preview-img" />
                <span className="preview-badge">✔ ID uploaded</span>
              </div>
            )}

            <label className="btn btn-gallery">
              📁 Choose ID Image
              <input type="file" accept="image/*" hidden
                onChange={e => handleFileChange(e, "idProof")} />
            </label>
          </div>

          <button type="submit" className="btn btn-submit" disabled={loading}>
            <span className="btn-submit-inner">
              {loading ? <><span className="spinner" aria-hidden="true" /> Submitting…</> : "Submit Registration"}
            </span>
          </button>

        </form>
      </div>
    </div>
  );
}