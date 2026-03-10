// src/components/ui/MapView.jsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

/* ── Fix default Leaflet icon paths ── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const goldIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
});

function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 13); }, [center, map]);
  return null;
}

export default function MapView({ providers = [], userLocation }) {
  const center = userLocation || [21.0477, 75.0628];

  return (
    <div className="map-view-container">
      <MapContainer center={center} zoom={13} style={{ height: '420px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter center={center} />

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <strong className="map-popup-you">📍 You are here</strong>
            </Popup>
          </Marker>
        )}

        {providers
          .filter((p) => p.latitude && p.longitude)
          .map((p) => (
            <Marker
              key={p._id}
              position={[p.latitude, p.longitude]}
              icon={p.subscription === 'premium' ? goldIcon : new L.Icon.Default()}
            >
              <Popup>
                <div className="map-popup">
                  <p className="map-popup-name">{p.name}</p>
                  <p className="map-popup-services">
                    {p.services?.slice(0, 2).map((s) => (typeof s === 'string' ? s : s.name)).join(', ')}
                  </p>
                  <div className="map-popup-meta">
                    <span className="map-popup-rating">★ {p.rating?.toFixed(1) || '5.0'}</span>
                    {p.distance != null && (
                      <span className="map-popup-distance">{p.distance.toFixed(1)} km</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <div className="map-legend">
        <div className="map-legend-item"><span>📍</span> Providers</div>
        <div className="map-legend-item"><span>⭐</span> Premium</div>
      </div>
    </div>
  );
}