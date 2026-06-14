import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../theme.css';
import './dashboard.css';
import { apiRequest, USER_ID } from '../api';

/* ── Module definitions ───────────────────────────────── */
const MODULES = [
  {
    id: 'sign',
    icon: '🧏',
    title: 'Sign Recognition',
    subtitle: 'Live ISL / ASL translation',
    path: '/sign',
    color: '#3B2A24',
    badge: 'AI',
  },
  {
    id: 'navigation',
    icon: '🗺️',
    title: 'Navigation Assistant',
    subtitle: 'Accessible route planning',
    path: '/navigation',
    color: '#1A5276',
    badge: 'GPS',
  },
  {
  id: 'environment',
  icon: '🔊',
  title: 'Environmental Awareness',
  subtitle: 'Live ambient sound monitoring',
  path: '/environment',
  color: '#7D3C98',
  badge: 'LIVE',
},
{
    id: 'alerts',
    icon: '🔊',
    title: 'Smart Alerts',
    subtitle: 'Environmental sound detection',
    path: '/smart-alerts',
    color: '#7D3C98',
    badge: 'LIVE',
  },
  {
    id: 'sos',
    icon: '🆘',
    title: 'Emergency SOS',
    subtitle: 'One-touch emergency help',
    path: '/sos',
    color: '#C0392B',
    badge: 'SOS',
  },
  {
    id: 'history',
    icon: '📋',
    title: 'History',
    subtitle: 'Activity logs & analytics',
    path: '/history',
    color: '#6B4E3D',
    badge: 'LOG',
  },
  {
  id: 'settings',
  icon: '⚙️',
  title: 'Settings',
  subtitle: 'Profile & preferences',
  path: '/settings',
  color: '#34495E',
  badge: 'USER',
}
];

export default function Dashboard() {
  const [contacts, setContacts]   = useState([]);
  const [navCount, setNavCount]   = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const navigate = useNavigate();
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

  /* ── Fetch quick stats ──────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [cr, nr, ar] = await Promise.all([
          apiRequest(`/contacts/${USER_ID}`).catch(() => ({ contacts: [] })),
          apiRequest(`/navigation/${USER_ID}`).catch(() => ({ history: [] })),
          apiRequest(`/alerts/${USER_ID}`).catch(() => ({ history: [] })),
        ]);
        setContacts(cr.contacts || []);
        setNavCount((nr.history || []).length);
        setAlertCount((ar.history || []).length);
      } catch {/* backend offline */}
    };
    load();
  }, []);

  const primaryContact = contacts.find(c => c.primary_contact) || contacts[0];

  return (
    <div className="sak-body dash-body">
      {/* ── Header bar ──────────────────────────────── */}
      <header className="dash-header">
        <div className="dash-header-brand">
          <span style={{ fontSize: 36 }}></span>
          <div>
            <h1 className="dash-header-title">SAKSHAM AI</h1>
            <p className="dash-header-sub">Accessibility Platform</p>
          </div>
        </div>
        <div className="dash-header-widgets">
          <div className="dash-widget">
            <span className="dash-widget-icon">📡</span>
            <span className="dash-widget-label">Routes Logged</span>
            <span className="dash-widget-val">{navCount}</span>
          </div>
          <div className="dash-widget">
            <span className="dash-widget-icon">🔊</span>
            <span className="dash-widget-label">Alerts Detected</span>
            <span className="dash-widget-val">{alertCount}</span>
          </div>
          <div className="dash-widget">
            <span className="dash-widget-icon">📇</span>
            <span className="dash-widget-label">SOS Contacts</span>
            <span className="dash-widget-val">{contacts.length}</span>
          </div>
        </div>
        <div className="welcome-card">
  <div>
    <h2>
      Welcome Back 👋
    </h2>

    <p>
      Your accessibility tools are ready.
    </p>
  </div>

  <div className="welcome-avatar">
    👤
  </div>
</div>
      </header>

      <div className="dash-content">
        {/* ── Quick status strip ─────────────────────── */}
        <div className="dash-status-row">
          <div className="dash-status-card">
            <span className="status-dot active" />
            <span>System Online</span>
          </div>
          {primaryContact && (
            <div className="dash-status-card">
              <span>★</span>
              <span>SOS: {primaryContact.name} ({primaryContact.phone})</span>
            </div>
          )}
          <div className="dash-status-card">
            <span>📍</span>
            <span>Location: <em>Tracking</em></span>
          </div>
        </div>

        {/* ── Module grid ────────────────────────────── */}
        <section aria-label="Accessibility modules">
        <h2 className="dash-section-title">Accessibility Modules</h2>

         <div className="dash-grid">
           {MODULES.map((m) => (
        <div key={m.id}
        className="dash-card"
        style={{ '--card-color': m.color }}
        onClick={() => navigate(m.path)}
      >
        <div className="dash-card-badge">{m.badge}</div>

        <div className="dash-card-icon">{m.icon}</div>

        <div className="dash-card-body">
          <h3 className="dash-card-title">{m.title}</h3>
          <p className="dash-card-sub">{m.subtitle}</p>
        </div>

        <span className="dash-card-arrow">→</span>
      </div>
    ))}
  </div>
</section>

        {/* ── Info strip ─────────────────────────────── */}
        <div className="dash-info-strip">
          <div className="dash-info-item">
            <span className="dash-info-icon">🤟</span>
            <div>
              <strong>Sign Recognition</strong>
              <p>ISL &amp; ASL via webcam — no backend required</p>
            </div>
          </div>
          <div className="dash-info-item">
            <span className="dash-info-icon">🗺️</span>
            <div>
              <strong>Navigation</strong>
              <p>Wheelchair, visually impaired &amp; hearing impaired modes</p>
            </div>
          </div>
          <div className="dash-info-item">
            <span className="dash-info-icon">🆘</span>
            <div>
              <strong>Emergency SOS</strong>
              <p>Hold 3 s → alert sent with live location</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
