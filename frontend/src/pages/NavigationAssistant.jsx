import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "../theme.css";
import { apiErrorMessage, apiRequest, USER_ID } from "../api";
import "./nav.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function formatDistance(meters) {
  if (!Number.isFinite(Number(meters))) {
    return "Route distance unavailable";
  }
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) {
    return "Time unavailable";
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function MapViewport({ position, geometry }) {
  const map = useMap();

  useEffect(() => {
    if (geometry?.length > 1) {
      map.fitBounds(geometry, { padding: [28, 28] });
      return;
    }

    if (position) {
      map.setView(position, 15);
    }
  }, [geometry, map, position]);

  return null;
}

export default function NavigationAssistant() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [position, setPosition] = useState(null);
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("Wheelchair");
  const [route, setRoute] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [planningRoute, setPlanningRoute] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [paused, setPaused] = useState(false);
  const [routeSaved, setRouteSaved] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentPosition = useMemo(() => {
    if (!position) {
      return null;
    }
    return [position.lat, position.lng];
  }, [position]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiRequest(`/navigation/${USER_ID}`);
      setHistory(data.history || []);
    } catch (err) {
      setError(apiErrorMessage(err, "Navigation history could not be loaded."));
    }
  }, []);
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
    fetchHistory();
  }, [fetchHistory]);

  const getCurrentLocation = useCallback(() => {
    setError("");
    setNotice("");

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location services are not supported in this browser."));
        return;
      }

      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (geoPosition) => {
          const coords = {
            lat: geoPosition.coords.latitude,
            lng: geoPosition.coords.longitude,
          };
          setPosition(coords);
          setLocationEnabled(true);
          setLoadingLocation(false);
          resolve(coords);
        },
        () => {
          setLoadingLocation(false);
          reject(new Error("Location permission was denied or unavailable."));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        },
      );
    });
  }, []);

  const enableLocation = async () => {
    try {
      await getCurrentLocation();
      setNotice("Live location enabled.");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not detect your current location."));
    }
  };

  const startNavigation = async () => {
    const destinationText = destination.trim();
    if (!destinationText) {
      setError("Enter a destination before starting navigation.");
      return;
    }

    setError("");
    setNotice("");
    setPlanningRoute(true);
    setPaused(false);
    setRouteSaved(false);

    try {
  const coords = position || (await getCurrentLocation());

  console.log("Coords:", coords);

  setRoute({
    source: { label: "Current Location" },

    destination: {
      label: destinationText,
      lat: coords.lat,
      lng: coords.lng,
    },

    distance_meters: 250,
    duration_seconds: 180,
    provider: "Saksham AI Demo",

    geometry: [
      [coords.lat, coords.lng],
      [coords.lat + 0.001, coords.lng + 0.001],
    ],

    instructions: [
      { instruction: "Go Straight 40m" },
      { instruction: "Turn Right" },
      { instruction: "Accessible Ramp Available" },
    ],
  });

  setNotice("Route ready. Follow the live directions below.");
}
      catch (err) {
      setRoute(null);
      setError(apiErrorMessage(err, "Route planning failed. Try a more specific destination."));
    } finally {
      setPlanningRoute(false);
    }
  };

  const completeNavigation = async () => {
    if (!route || !position || routeSaved) {
      return;
    }

    setSavingRoute(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/navigation", {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          source: route.source?.label || `${position.lat}, ${position.lng}`,
          destination: route.destination?.label || destination,
          mode,
          source_lat: position.lat,
          source_lng: position.lng,
          destination_lat: route.destination?.lat,
          destination_lng: route.destination?.lng,
          distance_meters: route.distance_meters,
          duration_seconds: route.duration_seconds,
          status: "completed",
        }),
      });
      setRouteSaved(true);
      setNotice("Completed navigation saved to history.");
      fetchHistory();
    } catch (err) {
      setError(apiErrorMessage(err, "Completed navigation could not be saved."));
    } finally {
      setSavingRoute(false);
    }
  };

  const instructions = route?.instructions || [];
  const destinationPosition = route?.destination ? [route.destination.lat, route.destination.lng] : null;

  return (
    <div className="navigation-page">
      <aside className="left-panel">
        <div>
          <h1>🧭 SAKSHAM AI</h1>
          <h3>Navigation & Accessibility</h3>
          <p>Accessible route planning with live location, route guidance, and saved trip history.</p>
        </div>

        <button className="smart-btn" onClick={enableLocation} disabled={loadingLocation}>
          {loadingLocation ? "Detecting Location..." : "📍 Enable Live Location"}
        </button>

        <div className="location-info">
          <h4>Current Location</h4>
          {locationEnabled && position ? (
            <>
              <p>Latitude: {position.lat.toFixed(6)}</p>
              <p>Longitude: {position.lng.toFixed(6)}</p>
            </>
          ) : (
            <p>Location Disabled</p>
          )}
        </div>

        <div className="mode-box">
          <h4>Accessibility Mode</h4>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option>Wheelchair</option>
            <option>Walking</option>
            <option>Visually Impaired</option>
            <option>Hearing Impaired</option>
          </select>
        </div>

        {route && (
          <div className="route-metrics">
            <h4>Route Summary</h4>
            <p>{formatDistance(route.distance_meters)}</p>
            <p>{formatDuration(route.duration_seconds)}</p>
            <p>{route.provider}</p>
          </div>
        )}

        <Link to="/dashboard" className="nav-back-link">← Back To Dashboard</Link>
      </aside>

      <main className="right-panel">
        {(error || notice) && (
          <div className={error ? "nav-message error" : "nav-message"}>
            {error || notice}
          </div>
        )}

        <div className="map-box">
          {currentPosition ? (
            <MapContainer center={currentPosition} zoom={15} className="nav-map">
              <TileLayer
                attribution="OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewport position={currentPosition} geometry={route?.geometry} />
              <Marker position={currentPosition}>
                <Popup>Your current location</Popup>
              </Marker>
              {destinationPosition && (
                <Marker position={destinationPosition}>
                  <Popup>{route.destination.label}</Popup>
                </Marker>
              )}
              {route?.geometry?.length > 1 && (
                <Polyline positions={route.geometry} pathOptions={{ color: "#3B2A24", weight: 6 }} />
              )}
            </MapContainer>
          ) : (
            <div className="placeholder">Enable Location To View Map</div>
          )}
        </div>

        <div className="destination-box">
          <input
            type="text"
            placeholder="Enter destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                startNavigation();
              }
            }}
          />
          <button onClick={startNavigation} disabled={planningRoute}>
            {planningRoute ? "Planning..." : "Start Navigation"}
          </button>
        </div>

        <div className="direction-box">
          <div className="direction-header">
            <h2>LIVE DIRECTIONS</h2>
            {route && <span className={`nav-status ${paused ? "paused" : "active"}`}>{paused ? "PAUSED" : "ACTIVE"}</span>}
          </div>

          {!route ? (
            <div className="nav-empty">Enter a destination and start navigation to generate route guidance.</div>
          ) : (
            instructions.map((step, index) => (
              <div className="direction-card" key={`${step.instruction}-${index}`}>
                <span className="step-number">{index + 1}</span>
                <span>{step.instruction}</span>
              </div>
            ))
          )}
        </div>

        <div className="controls">
          <button onClick={() => setPaused((value) => !value)} disabled={!route}>
            {paused ? "Resume Navigation" : "Pause Navigation"}
          </button>
          <button onClick={startNavigation} disabled={!destination.trim() || planningRoute}>
            Re-Route
          </button>
          <button onClick={completeNavigation} disabled={!route || routeSaved || savingRoute}>
            {routeSaved ? "Saved" : savingRoute ? "Saving..." : "Complete Navigation"}
          </button>
        </div>

        <div className="history-box">
          <div className="history-title">
            <h3>Route History</h3>
            <span>{history.length} saved</span>
          </div>
          {history.length === 0 ? (
            <p>No completed navigation history yet.</p>
          ) : (
            <ul>
              {history.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <strong>{item.destination}</strong>
                  <span>{item.mode} · {item.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Link className="sos-button" to="/sos" aria-label="Open Emergency SOS">
        🆘
      </Link>
    </div>
  );
}
