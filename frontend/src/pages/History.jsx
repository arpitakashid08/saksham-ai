import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../theme.css';
import { apiErrorMessage, apiRequest, USER_ID } from '../api';

const TABS = [
  { id: 'nav',   icon: '🗺️',  label: 'Navigation' },
  { id: 'alert', icon: '🔊',  label: 'Alerts' },
  { id: 'sos',   icon: '🆘',  label: 'SOS' },
  { id: 'sign',  icon: '🤟',  label: 'Sign Recognition' },
];

function percent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  return `${Math.round(numeric * 100)}%`;
}

function meters(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '—';
  }
  return numeric >= 1000 ? `${(numeric / 1000).toFixed(1)} km` : `${Math.round(numeric)} m`;
}

export default function History() {
  const [tab,     setTab]     = useState('nav');
  const [navH,    setNavH]    = useState([]);
  const [alertH,  setAlertH]  = useState([]);
  const [signH,   setSignH]   = useState([]);
  const [sosH,    setSosH]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    const requests = await Promise.allSettled([
      apiRequest(`/navigation/${USER_ID}`),
      apiRequest(`/alerts/${USER_ID}`),
      apiRequest(`/sign-history/${USER_ID}`),
      apiRequest(`/sos-history/${USER_ID}`),
    ]);

    const [navResult, alertResult, signResult, sosResult] = requests;

    if (navResult.status === 'fulfilled') setNavH(navResult.value.history || []);
    if (alertResult.status === 'fulfilled') setAlertH(alertResult.value.history || []);
    if (signResult.status === 'fulfilled') setSignH(signResult.value.history || []);
    if (sosResult.status === 'fulfilled') setSosH(sosResult.value.history || []);

    const failed = requests.filter((result) => result.status === 'rejected');
    if (failed.length) {
      setError(apiErrorMessage(failed[0].reason, 'Some history data could not be loaded.'));
    }

    setLoading(false);
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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="sak-body">
      <div className="sak-page">

        <aside className="sak-sidebar">
          <div className="sak-brand">
            <span className="sak-brand-icon">📋</span>
            <h1>SAKSHAM AI</h1>
          </div>
          <p className="sak-tagline">Activity History</p>
          <p className="sak-desc">Review navigation routes, detected environmental alerts, SOS events, and sign translations.</p>

          <div className="sak-illus">
            <span className="sak-illus-icon">📜</span>
            <span className="sak-illus-label">HISTORY</span>
          </div>

          <button className="btn-primary" onClick={fetchAll} disabled={loading}>
            {loading ? <span className="sak-spinner" /> : '🔄'} Refresh
          </button>

          <Link to="/dashboard" style={{ width: '100%' }}>
            <button className="btn-outline">← Dashboard</button>
          </Link>
        </aside>

        <main className="sak-main">
          {error && (
            <div className="sak-panel" style={{ border: '3px solid var(--red-dot)' }}>
              <p style={{ color: 'var(--red-dot)', margin: 0, fontSize: 18 }}>⚠️ {error}</p>
            </div>
          )}

          <div className="sak-panel" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={tab === t.id ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}
                  style={{ width: 'auto' }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'nav' && (
            <div className="sak-panel">
              <div className="sak-panel-header">
                <h2 className="sak-panel-title">🗺️ Navigation History</h2>
                <span className="sak-badge">{navH.length} entries</span>
              </div>
              {loading ? (
                <div className="sak-empty"><span className="sak-spinner" /> Loading…</div>
              ) : navH.length === 0 ? (
                <div className="sak-empty"><span className="sak-empty-icon">🗺️</span>No navigation history yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="sak-table">
                    <thead>
                      <tr>
                        <th>From</th><th>To</th><th>Mode</th><th>Distance</th><th>Status</th><th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {navH.map(r => (
                        <tr key={r.id}>
                          <td>{r.source || 'Current Location'}</td>
                          <td>{r.destination}</td>
                          <td><span className="sak-badge">{r.mode}</span></td>
                          <td>{meters(r.distance_meters)}</td>
                          <td>{r.status || 'completed'}</td>
                          <td>{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'alert' && (
            <div className="sak-panel">
              <div className="sak-panel-header">
                <h2 className="sak-panel-title">🔊 Alert History</h2>
                <span className="sak-badge">{alertH.length} entries</span>
              </div>
              {loading ? (
                <div className="sak-empty"><span className="sak-spinner" /> Loading…</div>
              ) : alertH.length === 0 ? (
                <div className="sak-empty"><span className="sak-empty-icon">🔇</span>No alerts logged yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="sak-table">
                    <thead>
                      <tr>
                        <th>Type</th><th>Detected</th><th>Confidence</th><th>Source</th><th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertH.map(r => (
                        <tr key={r.id}>
                          <td><span className="sak-badge">{r.alert_type}</span></td>
                          <td>{r.detected_text}</td>
                          <td>{percent(r.confidence)}</td>
                          <td>{r.source || 'environmental-awareness'}</td>
                          <td>{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'sos' && (
            <div className="sak-panel">
              <div className="sak-panel-header">
                <h2 className="sak-panel-title">🆘 SOS History</h2>
                <span className="sak-badge">{sosH.length} entries</span>
              </div>
              {loading ? (
                <div className="sak-empty"><span className="sak-spinner" /> Loading…</div>
              ) : sosH.length === 0 ? (
                <div className="sak-empty"><span className="sak-empty-icon">🆘</span>No SOS events logged yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="sak-table">
                    <thead>
                      <tr>
                        <th>Contact</th><th>Phone</th><th>Status</th><th>Location</th><th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sosH.map(r => (
                        <tr key={r.id}>
                          <td>{r.contact_name || 'No contact configured'}</td>
                          <td>{r.phone || '—'}</td>
                          <td><span className="sak-badge red">{r.status}</span></td>
                          <td>
                            {r.location_link ? (
                              <a href={r.location_link} target="_blank" rel="noreferrer">Open Map</a>
                            ) : 'Not shared'}
                          </td>
                          <td>{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'sign' && (
            <div className="sak-panel">
              <div className="sak-panel-header">
                <h2 className="sak-panel-title">🧏 Sign Recognition History</h2>
                <span className="sak-badge">{signH.length} entries</span>
              </div>
              {loading ? (
                <div className="sak-empty"><span className="sak-spinner" /> Loading…</div>
              ) : signH.length === 0 ? (
                <div className="sak-empty"><span className="sak-empty-icon">🤟</span>No sign translations logged yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="sak-table">
                    <thead>
                      <tr><th>Translated Text</th><th>Timestamp</th></tr>
                    </thead>
                    <tbody>
                      {signH.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontSize: 22, letterSpacing: 2 }}>{r.translated_text}</td>
                          <td>{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
