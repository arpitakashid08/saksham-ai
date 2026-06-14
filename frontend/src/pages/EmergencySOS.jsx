import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../theme.css';
import './sos.css';
import { apiErrorMessage, apiRequest, USER_ID } from '../api';

const EMPTY_CONTACT = { name: '', relationship: '', phone: '', email: '', primary_contact: false };

/* ── Emergency message builder ───────────────────────── */
function buildSosMessage(locationLink) {
  return `🆘 Emergency Alert from Saksham AI

I may require immediate assistance.

${locationLink ? `Current Location:\n${locationLink}\n` : ''}
Please contact me immediately.

— Sent via Saksham AI Emergency SOS`;
}

export default function EmergencySOS() {
  const [contacts,      setContacts]      = useState([]);
  const [form,          setForm]          = useState(EMPTY_CONTACT);
  const [editId,        setEditId]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [formError,     setFormError]     = useState('');
  const [pageError,     setPageError]     = useState('');
  const [pageNotice,    setPageNotice]    = useState('');
  const [sosError,      setSosError]      = useState('');
  const [sosActive,     setSosActive]     = useState(false);
  const [sosTriggered,  setSosTriggered]  = useState(false);
  const [countdown,     setCountdown]     = useState(0);
  const [shareLocation, setShareLocation] = useState(false);
  const [locationLink,  setLocationLink]  = useState('');
  const [sosMessage,    setSosMessage]    = useState('');
  const holdTimer  = useRef(null);
  const countTimer = useRef(null);

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

  /* ── Fetch contacts ───────────────────────────────── */
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await apiRequest(`/contacts/${USER_ID}`);
      setContacts(data.contacts || []);
    } catch (err) {
      setPageError(apiErrorMessage(err, 'Could not load contacts. Check that the backend is running.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  /* ── Form helpers ─────────────────────────────────── */
  const handleFieldChange = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setFormError('');
  };

  const validateForm = () => {
    if (!form.name.trim())  return 'Name is required.';
    if (!form.phone.trim()) return 'Phone number is required.';
    return '';
  };

  const saveContact = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setLoading(true);
    setFormError('');
    setPageNotice('');
    try {
      const url    = editId ? `/contacts/${editId}` : '/contacts';
      const method = editId ? 'PUT' : 'POST';
      await apiRequest(url, {
        method,
        body: JSON.stringify({ ...form, user_id: USER_ID }),
      });
      setForm(EMPTY_CONTACT);
      setEditId(null);
      setPageNotice(editId ? 'Contact updated successfully.' : 'Contact saved successfully.');
      await fetchContacts();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save contact. Check server connection.'));
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    setPageError('');
    try {
      await apiRequest(`/contacts/${id}`, { method: 'DELETE' });
      setPageNotice('Contact deleted.');
      await fetchContacts();
    } catch (err) {
      setPageError(apiErrorMessage(err, 'Could not delete contact.'));
    }
  };

  const editContact = (c) => {
    setForm({ name: c.name, relationship: c.relationship, phone: c.phone, email: c.email, primary_contact: !!c.primary_contact });
    setEditId(c.id);
    document.getElementById('sos-form-name')?.focus();
  };

  const cancelEdit = () => { setForm(EMPTY_CONTACT); setEditId(null); setFormError(''); };

  /* ── Location fetch ───────────────────────────────── */
  const getLocationLink = () => new Promise((res) => {
    navigator.geolocation?.getCurrentPosition(
      pos => res(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`),
      ()  => res('')
    );
  });

  /* ── SOS hold button ──────────────────────────────── */
  const startHold = () => {
    if (sosTriggered) return;
    setSosActive(true);
    setCountdown(3);
    countTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countTimer.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    holdTimer.current = setTimeout(triggerSOS, 3000);
  };

  const cancelHold = () => {
    setSosActive(false);
    setCountdown(0);
    clearTimeout(holdTimer.current);
    clearInterval(countTimer.current);
  };

  const triggerSOS = async () => {
    setSosActive(false);
    setSosTriggered(true);
    setSosError('');
    setPageNotice('');
    navigator.vibrate?.([300, 150, 300, 150, 300]);

    let link = '';
    if (shareLocation) link = await getLocationLink();
    setLocationLink(link);

    const primary = contacts.find(c => c.primary_contact) || contacts[0];
    const msg = buildSosMessage(link);
    setSosMessage(msg);

    try {
      await apiRequest('/sos-history', {
        method: 'POST',
        body: JSON.stringify({
          user_id: USER_ID,
          contact_id: primary?.id || null,
          contact_name: primary?.name || '',
          phone: primary?.phone || '',
          location_link: link,
          message: msg,
          status: primary ? 'triggered' : 'triggered_without_contact',
        }),
      });
      setPageNotice(primary ? 'SOS event saved to history.' : 'SOS saved, but no emergency contacts are configured.');
    } catch (err) {
      setSosError(apiErrorMessage(err, 'SOS was triggered but could not be saved to history.'));
    }
  };

  const resetSOS = () => { setSosTriggered(false); setSosMessage(''); setLocationLink(''); setSosError(''); };

  return (
    <div className="sak-body">
      <div className="sak-page">

        {/* ── SIDEBAR ─────────────────────────────────── */}
        <aside className="sak-sidebar">
          <div className="sak-brand">
            <span className="sak-brand-icon">🆘</span>
            <h1>SAKSHAM AI</h1>
          </div>
          <p className="sak-tagline">Emergency SOS</p>
          <p className="sak-desc">
            One-touch emergency alert. Contacts your primary emergency contact with your live location.
          </p>

          <div className="sak-illus">
            <span className="sak-illus-icon">🚨</span>
            <span className="sak-illus-label">EMERGENCY</span>
          </div>

          {/* Share Location Toggle */}
          <div className="sak-toggle-row" style={{ padding: '12px 0' }}>
            <span>📍 Share Live Location</span>
            <label className="sak-toggle">
              <input type="checkbox" checked={shareLocation} onChange={e => setShareLocation(e.target.checked)} />
              <span className="sak-toggle-slider" />
            </label>
          </div>

          <div className="sos-services">
            <p className="sak-label">Emergency Services</p>
            <div className="sos-service-item">🚔 Police</div>
            <div className="sos-service-item">🚑 Ambulance</div>
            <div className="sos-service-item">🌸 Women Safety Helpline</div>
          </div>

          <Link to="/dashboard" style={{ width: '100%' }}>
            <button className="btn-outline">← Dashboard</button>
          </Link>
        </aside>

        {/* ── MAIN ────────────────────────────────────── */}
        <main className="sak-main">

          {/* SOS Button */}
          <div className="sak-panel" style={{ textAlign: 'center' }}>
            <div className="sak-panel-header" style={{ justifyContent: 'center' }}>
              <h2 className="sak-panel-title">🆘 Emergency Button</h2>
            </div>

            {!sosTriggered ? (
              <>
                <p className="sos-hint">Hold the button for <strong>3 seconds</strong> to trigger SOS</p>
                <div className="sos-btn-wrap">
                  <button
                    id="sos-hold-btn"
                    className={`sos-btn ${sosActive ? 'holding' : ''}`}
                    onMouseDown={startHold}
                    onMouseUp={cancelHold}
                    onMouseLeave={cancelHold}
                    onTouchStart={e => { e.preventDefault(); startHold(); }}
                    onTouchEnd={cancelHold}
                    aria-label="Hold to trigger emergency SOS"
                  >
                    {sosActive ? countdown : 'SOS'}
                  </button>
                  {sosActive && (
                    <svg className="sos-ring" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                        stroke="var(--red-dot)" strokeLinecap="round"
                        strokeDasharray="339" strokeDashoffset="0"
                        style={{ animation: 'sosRing 3s linear forwards' }} />
                    </svg>
                  )}
                </div>
              </>
            ) : (
              <div className="sos-triggered">
                <span className="sos-triggered-icon">🚨</span>
                <h3>SOS TRIGGERED!</h3>
                <p>Emergency contacts have been alerted.</p>
                {locationLink && (
                  <a href={locationLink} target="_blank" rel="noreferrer" className="sos-loc-link">
                    📍 Your Live Location
                  </a>
                )}
                {sosError && <p className="sos-form-error">{sosError}</p>}
                <div className="sos-msg-box">
                  <pre>{sosMessage}</pre>
                </div>
                <button className="btn-outline btn-sm" style={{ marginTop: 12, width: 'auto' }} onClick={resetSOS}>
                  Reset SOS
                </button>
              </div>
            )}
          </div>

          {/* Contacts Panel */}
          <div className="sak-panel">
            <div className="sak-panel-header">
              <h2 className="sak-panel-title">📇 Emergency Contacts</h2>
              <span className="sak-badge">{contacts.length} saved</span>
            </div>

            {pageError && <p className="sos-form-error">{pageError}</p>}
            {pageNotice && <p className="sos-form-success">{pageNotice}</p>}

            {/* Contact Form */}
            <div className="sos-contact-form">
              <h3 className="sos-form-title">{editId ? '✏️ Edit Contact' : '➕ Add Contact'}</h3>
              <div className="sak-form-grid">
                <div className="sak-field">
                  <label className="sak-label" htmlFor="sos-form-name">Name *</label>
                  <input id="sos-form-name" className="sak-input" placeholder="Full name"
                    value={form.name} onChange={e => handleFieldChange('name', e.target.value)} />
                </div>
                <div className="sak-field">
                  <label className="sak-label" htmlFor="sos-rel">Relationship</label>
                  <input id="sos-rel" className="sak-input" placeholder="Mother, Friend…"
                    value={form.relationship} onChange={e => handleFieldChange('relationship', e.target.value)} />
                </div>
                <div className="sak-field">
                  <label className="sak-label" htmlFor="sos-phone">Phone *</label>
                  <input id="sos-phone" className="sak-input" placeholder="+91 9999999999" type="tel"
                    value={form.phone} onChange={e => handleFieldChange('phone', e.target.value)} />
                </div>
                <div className="sak-field">
                  <label className="sak-label" htmlFor="sos-email">Email</label>
                  <input id="sos-email" className="sak-input" placeholder="contact@email.com" type="email"
                    value={form.email} onChange={e => handleFieldChange('email', e.target.value)} />
                </div>
              </div>

              <div className="sos-primary-row">
                <label className="sak-toggle">
                  <input type="checkbox" checked={form.primary_contact}
                    onChange={e => handleFieldChange('primary_contact', e.target.checked)} />
                  <span className="sak-toggle-slider" />
                </label>
                <span style={{ fontSize: 17, letterSpacing: 1 }}>Mark as Primary Contact</span>
              </div>

              {formError && <p className="sos-form-error">{formError}</p>}

              <div className="sos-form-actions">
                <button className="btn-primary btn-sm" style={{ width: 'auto', background: 'var(--brown)' }}
                  onClick={saveContact} disabled={loading}>
                  {loading ? <span className="sak-spinner" /> : null}
                  {editId ? '💾 Update' : '➕ Add Contact'}
                </button>
                {editId && (
                  <button className="btn-outline btn-sm" style={{ width: 'auto' }} onClick={cancelEdit}>Cancel</button>
                )}
              </div>
            </div>

            {/* Contact list */}
            {loading && !contacts.length ? (
              <div className="sak-empty"><span className="sak-spinner" /> Loading contacts…</div>
            ) : contacts.length === 0 ? (
              <div className="sak-empty">
                <span className="sak-empty-icon">📇</span>
                No emergency contacts added yet.
              </div>
            ) : (
              <div className="sos-contact-list">
                {contacts.map(c => (
                  <div key={c.id} className={`sos-contact-card ${c.primary_contact ? 'primary' : ''}`}>
                    <div className="sos-contact-avatar">{c.name[0]?.toUpperCase()}</div>
                    <div className="sos-contact-info">
                      <strong className="sos-contact-name">
                        {c.name}
                        {c.primary_contact ? <span className="sos-primary-badge">★ PRIMARY</span> : null}
                      </strong>
                      <span className="sos-contact-rel">{c.relationship}</span>
                      <span className="sos-contact-detail">📞 {c.phone}</span>
                      {c.email && <span className="sos-contact-detail">✉️ {c.email}</span>}
                    </div>
                    <div className="sos-contact-actions">
                      <button className="btn-outline btn-sm" onClick={() => editContact(c)}>✏️</button>
                      <button className="btn-danger btn-sm" onClick={() => deleteContact(c.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
