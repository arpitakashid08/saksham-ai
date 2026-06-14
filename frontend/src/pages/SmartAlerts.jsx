import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../theme.css';
import './alerts-page.css';
import { apiErrorMessage, apiRequest, USER_ID } from '../api';
import {
  EnvironmentSoundMonitor,
  SOUND_CATEGORIES,
  getSoundCategory,
  loadStoredDetections,
  publishEnvironmentalDetection,
  subscribeEnvironmentalDetections,
} from '../services/environmentSound';

function detectionToAlert(detection, source = 'smart-alerts') {
  const category = getSoundCategory(detection.type);
  return {
    id: `${source}-${detection.id || Date.now()}`,
    type: detection.type,
    icon: category.icon,
    label: category.label,
    text: category.alertText,
    rawText: detection.detectedText || category.alertText,
    confidence: Number(detection.confidence || 0),
    time: detection.timestamp || new Date().toLocaleTimeString('en-IN'),
    source,
  };
}

function historyToAlert(row) {
  const category = getSoundCategory(row.alert_type);
  return {
    id: `history-${row.id}`,
    type: row.alert_type,
    icon: category.icon,
    label: category.label,
    text: row.detected_text || category.alertText,
    rawText: row.detected_text || category.alertText,
    confidence: Number(row.confidence || 0),
    time: row.timestamp,
    source: row.source || 'history',
  };
}

export default function SmartAlerts() {
  const [micEnabled,    setMicEnabled]    = useState(false);
  const [micError,      setMicError]      = useState('');
  const [apiError,      setApiError]      = useState('');
  const [listening,     setListening]     = useState(false);
  const [alerts,        setAlerts]        = useState(() => loadStoredDetections().map((item) => detectionToAlert(item, item.source || 'environmental-awareness')));
  const [enabledTypes,  setEnabledTypes]  = useState(
    () => Object.fromEntries(SOUND_CATEGORIES.map(s => [s.id, true]))
  );
  const monitorRef = useRef(null);
  const enabledTypesRef = useRef(enabledTypes);
  const listEndRef  = useRef(null);

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
    enabledTypesRef.current = enabledTypes;
    monitorRef.current?.setEnabledTypes(enabledTypes);
  }, [enabledTypes]);

  const addAlert = useCallback((alert) => {
    setAlerts(prev => [alert, ...prev.filter((item) => item.id !== alert.id)].slice(0, 80));
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiRequest(`/alerts/${USER_ID}`);
      const historyAlerts = (data.history || []).map(historyToAlert);
      setAlerts(prev => {
        const existing = new Map(prev.map((item) => [item.id, item]));
        historyAlerts.forEach((item) => existing.set(item.id, item));
        return Array.from(existing.values()).slice(0, 80);
      });
    } catch (err) {
      setApiError(apiErrorMessage(err, 'Alert history could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveAlert = useCallback(async (alert) => {
    try {
      await apiRequest('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          user_id: USER_ID,
          alert_type: alert.type,
          detected_text: alert.rawText,
          confidence: alert.confidence,
          source: 'smart-alerts',
        }),
      });
    } catch (err) {
      setApiError(apiErrorMessage(err, 'Alert detected but could not be saved to history.'));
    }
  }, []);

  const handleDetection = useCallback((detection) => {
    if (enabledTypesRef.current[detection.type] === false) {
      return;
    }

    const alert = detectionToAlert(detection, 'smart-alerts');
    addAlert(alert);
    saveAlert(alert);
    publishEnvironmentalDetection({ ...detection, source: 'smart-alerts' });
    navigator.vibrate?.([200, 100, 200]);
  }, [addAlert, saveAlert]);

  const requestMic = useCallback(async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicEnabled(true);
    } catch {
      setMicError('Microphone access denied. Please allow mic in browser settings.');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeEnvironmentalDetections((detection) => {
      if (detection.source === 'smart-alerts' || enabledTypesRef.current[detection.type] === false) {
        return;
      }
      addAlert(detectionToAlert(detection, detection.source || 'environmental-awareness'));
    });
    return unsubscribe;
  }, [addAlert]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [alerts]);

  const startListening = async () => {
    setMicError('');
    setApiError('');
    try {
      monitorRef.current?.stop();
      const monitor = new EnvironmentSoundMonitor({
        enabledTypes,
        environmentMode: 'General Area',
        onDetection: handleDetection,
        onError: (err) => setMicError(apiErrorMessage(err, 'Microphone monitoring failed.')),
      });
      monitorRef.current = monitor;
      await monitor.start();
      setMicEnabled(true);
      setListening(true);
    } catch (err) {
      setListening(false);
      setMicError(apiErrorMessage(err, 'Microphone access denied. Please allow mic in browser settings.'));
    }
  };

  const stopListening = useCallback(() => {
    monitorRef.current?.stop();
    monitorRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleType = (id) => {
    setEnabledTypes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearAlerts = () => setAlerts([]);

  const summary = useMemo(() => (
    SOUND_CATEGORIES
      .filter(category => alerts.some(alert => alert.type === category.id))
      .map(category => ({
        ...category,
        count: alerts.filter(alert => alert.type === category.id).length,
      }))
  ), [alerts]);

  return (
    <div className="sak-body">
      <div className="sak-page">

        <aside className="sak-sidebar">
          <div className="sak-brand">
            <span className="sak-brand-icon">🔊</span>
            <h1>SAKSHAM AI</h1>
          </div>
          <p className="sak-tagline">Smart Alerts</p>
          <p className="sak-desc">
            Alerts generated from actual environmental sound detections captured by the microphone monitor.
          </p>

          <div className="sak-illus">
            <span className="sak-illus-icon">🎙️</span>
            <span className="sak-illus-label">LISTENING</span>
          </div>

          {!micEnabled ? (
            <>
              <button className="btn-primary" onClick={requestMic}>🎙️ Enable Microphone</button>
              {micError && <p style={{ color: 'var(--red-dot)', fontSize: 14, margin: 0 }}>{micError}</p>}
            </>
          ) : listening ? (
            <button className="btn-primary" style={{ background: 'var(--amber)' }} onClick={stopListening}>
              ⏹ Stop Listening
            </button>
          ) : (
            <button className="btn-primary" onClick={startListening}>🎙️ Start Listening</button>
          )}

          <div className="status-pill" style={{ justifyContent: 'center' }}>
            <span className={`status-dot ${listening ? 'active' : micEnabled ? 'idle' : 'paused'}`} />
            {listening ? 'LISTENING' : micEnabled ? 'MIC READY' : 'MIC OFF'}
          </div>

          <button className="btn-outline btn-sm" onClick={clearAlerts} style={{ width: '100%' }}>
            ✕ Clear Alerts
          </button>

          <Link to="/dashboard" style={{ width: '100%' }}>
            <button className="btn-outline">← Dashboard</button>
          </Link>
        </aside>

        <main className="sak-main">
          {(micError || apiError) && (
            <div className="sak-panel" style={{ border: '3px solid var(--red-dot)' }}>
              <p style={{ color: 'var(--red-dot)', margin: 0, fontSize: 18 }}>{micError || apiError}</p>
            </div>
          )}

          <div className="sak-panel">
            <div className="sak-panel-header">
              <h2 className="sak-panel-title">📡 Live Detection Feed</h2>
              {listening && <span className="sak-badge green">● LIVE</span>}
              <span className="sak-badge" style={{ marginLeft: 'auto' }}>{alerts.length} alerts</span>
            </div>

            {listening && (
              <div className="alerts-wave" aria-hidden="true">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            )}

            <div className="alerts-feed">
              {alerts.length === 0 ? (
                <div className="sak-empty">
                  <span className="sak-empty-icon">🔇</span>
                  {micEnabled ? 'Press Start Listening to begin real-time detection' : 'Enable microphone to start'}
                </div>
              ) : (
                alerts.map(a => (
                  <div key={a.id} className="sak-alert-item">
                    <span className="sak-alert-icon">{a.icon}</span>
                    <div className="sak-alert-body">
                      <span className="sak-alert-type">{a.label}</span>
                      <p className="sak-alert-text">{a.text}</p>
                      <span className="sak-alert-meta">
                        {a.time} · Confidence: {Math.round(a.confidence * 100)}% · Source: {a.source}
                      </span>
                    </div>
                    <div className="alerts-conf-bar-wrap" aria-hidden="true">
                      <div className="alerts-conf-bar" style={{ height: `${Math.round(a.confidence * 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
              <div ref={listEndRef} />
            </div>
          </div>

          <div className="sak-panel">
            <div className="sak-panel-header">
              <h2 className="sak-panel-title">⚙️ Alert Settings</h2>
            </div>
            <div>
              {SOUND_CATEGORIES.map(s => (
                <div key={s.id} className="sak-toggle-row">
                  <span>{s.icon} {s.label}</span>
                  <label className="sak-toggle">
                    <input
                      type="checkbox"
                      checked={enabledTypes[s.id]}
                      onChange={() => toggleType(s.id)}
                    />
                    <span className="sak-toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {summary.length > 0 && (
            <div className="sak-panel">
              <div className="sak-panel-header">
                <h2 className="sak-panel-title">📋 Session Summary</h2>
              </div>
              <div className="alerts-summary-grid">
                {summary.map(s => (
                  <div key={s.id} className="alerts-summary-card">
                    <span className="alerts-summary-icon">{s.icon}</span>
                    <span className="alerts-summary-label">{s.label}</span>
                    <span className="alerts-summary-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
