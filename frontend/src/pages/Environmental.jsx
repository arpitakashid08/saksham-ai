import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "../theme.css";
import "./envir.css";
import "leaflet/dist/leaflet.css";
import { apiErrorMessage, apiRequest, USER_ID } from "../api";
import {
  EnvironmentSoundMonitor,
  SOUND_CATEGORIES,
  SOUND_CLASSIFIER_MODE,
  publishEnvironmentalDetection,
} from "../services/environmentSound";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 15);
  }, [map, position]);

  return null;
}

const DEFAULT_POSITION = [19.076, 72.8777];

export default function Environmental() {
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [locationStatus, setLocationStatus] = useState("Location Disabled");
  const [monitoring, setMonitoring] = useState(false);
  const [events, setEvents] = useState([]);
  const [environmentMode, setEnvironmentMode] = useState("General Area");
  const [micError, setMicError] = useState("");
  const [apiError, setApiError] = useState("");
  const [monitorStatus, setMonitorStatus] = useState("Microphone Off");
  const monitorRef = useRef(null);
  const positionRef = useRef(DEFAULT_POSITION);
  useEffect(() => {
  const saved = JSON.parse(
    localStorage.getItem("saksham_settings")
  );

  if (saved?.darkMode) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Location Unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextPosition = [pos.coords.latitude, pos.coords.longitude];
        setPosition(nextPosition);
        setLocationStatus("Live Location Active");
      },
      () => {
        setLocationStatus("Location Disabled");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
  }, []);

  const saveDetection = useCallback(async (detection) => {
    const [lat, lng] = positionRef.current;
    try {
      await apiRequest("/alerts", {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          alert_type: detection.type,
          detected_text: detection.detectedText,
          confidence: detection.confidence,
          source: "environmental-awareness",
          location_lat: lat,
          location_lng: lng,
        }),
      });
    } catch (err) {
      setApiError(apiErrorMessage(err, "Detection was captured but could not be saved to history."));
    }
  }, []);

  const handleDetection = useCallback((detection) => {
    setEvents((prev) => [detection, ...prev].slice(0, 30));
    setApiError("");
    publishEnvironmentalDetection({ ...detection, source: "environmental-awareness" });
    saveDetection(detection);
    if (detection.level === "HIGH") {
      navigator.vibrate?.([220, 100, 220]);
    }
  }, [saveDetection]);

  const startMonitoring = async () => {
    setMicError("");
    setApiError("");

    try {
      monitorRef.current?.stop();
      const monitor = new EnvironmentSoundMonitor({
        environmentMode,
        onDetection: handleDetection,
        onStatus: (status) => setMonitorStatus(status === "listening" ? "Listening" : "Microphone Off"),
        onError: (err) => setMicError(apiErrorMessage(err, "Microphone monitoring failed.")),
      });
      monitorRef.current = monitor;
      await monitor.start();
      setMonitoring(true);
    } catch (err) {
      setMonitoring(false);
      setMicError(apiErrorMessage(err, "Microphone access denied. Please allow mic access in browser settings."));
    }
  };

  const stopMonitoring = useCallback(() => {
    monitorRef.current?.stop();
    monitorRef.current = null;
    setMonitoring(false);
    setMonitorStatus("Microphone Off");
  }, []);

  useEffect(() => {
    monitorRef.current?.setEnvironmentMode(environmentMode);
  }, [environmentMode]);

  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  const latestAlert = events[0];
  const summary = useMemo(() => (
    SOUND_CATEGORIES.map((category) => ({
      ...category,
      count: events.filter((event) => event.type === category.id).length,
    }))
  ), [events]);

  return (
    <div className="env-page">
      <aside className="env-sidebar">
        <div className="env-logo">🔊</div>

        <h1 className="env-title">SAKSHAM AI</h1>

        <p className="env-subtitle">Environmental Awareness</p>

        <div className="env-description">
          Live microphone-based environmental monitoring with local signal analysis and persisted alert history.
        </div>

        <button
          className="env-main-btn"
          onClick={monitoring ? stopMonitoring : startMonitoring}
        >
          {monitoring ? "⏸ Pause Monitoring" : "▶ Start Monitoring"}
        </button>

        <div className="env-info-box">
          <h4>Current Location</h4>
          <p>{locationStatus}</p>
        </div>

        <div className="env-info-box">
          <h4>Microphone</h4>
          <p>{monitorStatus}</p>
        </div>

        <div className="env-info-box">
          <h4>Classifier</h4>
          <p>{SOUND_CLASSIFIER_MODE.label}</p>
        </div>

        <div className="env-info-box">
          <h4>Environment Mode</h4>

          <select
            value={environmentMode}
            onChange={(e) => setEnvironmentMode(e.target.value)}
          >
            <option>General Area</option>
            <option>Railway Station</option>
            <option>School</option>
            <option>Hospital</option>
            <option>Marketplace</option>
          </select>
        </div>

        <div className="env-info-box">
          <h4>Detection Types</h4>

          <ul>
            {SOUND_CATEGORIES.map((category) => (
              <li key={category.id}>{category.icon} {category.label}</li>
            ))}
          </ul>
        </div>

        <Link to="/dashboard" className="env-back-btn">
          ← Back To Dashboard
        </Link>
      </aside>

      <main className="env-main">
        {(micError || apiError) && (
          <div className="env-error">
            {micError || apiError}
          </div>
        )}

        <div className="env-map-panel">
          <div className="env-panel-header">
            <h2>LIVE ENVIRONMENT MAP</h2>
            <span className={`env-status ${monitoring ? "active" : "idle"}`}>
              {monitoring ? "LIVE" : "IDLE"}
            </span>
          </div>

          <MapContainer
            center={position}
            zoom={15}
            style={{
              height: "320px",
              width: "100%",
            }}
          >
            <TileLayer
              attribution="OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <RecenterMap position={position} />

            <Marker position={position}>
              <Popup>Your Current Location</Popup>
            </Marker>
          </MapContainer>
        </div>

        {latestAlert && (
          <div className={`env-alert ${latestAlert.level === "HIGH" ? "danger" : ""}`}>
            <h3>PRIORITY ALERT</h3>

            <h1>
              {latestAlert.icon} {latestAlert.title}
            </h1>

            <p>Direction: {latestAlert.direction}</p>
            <p>Confidence: {latestAlert.confidencePercent}%</p>
            <p>Classifier: {latestAlert.classifier}</p>
          </div>
        )}

        <div className="env-feed">
          <div className="env-panel-header">
            <h2>LIVE DETECTION FEED</h2>
            <span className="env-count">{events.length} events</span>
          </div>

          {events.length === 0 ? (
            <div className="env-empty">
              {monitoring
                ? "Listening to the microphone. Meaningful detections will appear here."
                : "Start monitoring to listen for sirens, horns, doorbells, alarms, announcements, and trains."}
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="env-event-card">
                <div className="event-icon">{event.icon}</div>

                <div className="event-content">
                  <h3>{event.title}</h3>
                  <p>{event.text}</p>
                  <p>Direction: {event.direction}</p>
                  <div className="env-confidence" aria-label={`Confidence ${event.confidencePercent}%`}>
                    <span style={{ width: `${event.confidencePercent}%` }} />
                  </div>
                </div>

                <span className="event-time">{event.timestamp}</span>
              </div>
            ))
          )}
        </div>

        <div className="env-summary">
          <h2>ENVIRONMENT SUMMARY</h2>

          <div className="summary-grid">
            {summary.map((item) => (
              <div className="summary-card" key={item.id}>
                {item.icon}
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
