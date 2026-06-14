import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CameraFeed from '../components/CameraFeed';
import TranscriptBox from '../components/TranscriptBox';
import ControlPanel from '../components/ControlPanel';
import '../sign.css';
import { apiErrorMessage, apiRequest, USER_ID } from '../api';

async function sendFrameToFlask(imageDataUrl, language) {
  const data = await apiRequest('/api/recognize', {
    method: 'POST',
    body: JSON.stringify({ image: imageDataUrl, language }),
  });
  return { label: data.label, confidence: Number(data.confidence || 0) };
}

async function saveSignHistory(label) {
  await apiRequest('/sign-history', {
    method: 'POST',
    body: JSON.stringify({
      user_id: USER_ID,
      translated_text: label,
    }),
  });
}

export default function SignRecognition() {
  const webcamRef   = useRef(null);
  const intervalRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const [isActive,    setIsActive]    = useState(false);
  const [transcript,  setTranscript]  = useState([]);
  const [detected,    setDetected]    = useState('—');
  const [confidence,  setConfidence]  = useState(0);
  const [language,    setLanguage]    = useState('ISL');
  const [camReady,    setCamReady]    = useState(false);
  const [recognitionError, setRecognitionError] = useState('');

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

  /* Auto-scroll transcript */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  /* Camera permission granted */
  const onUserMedia = useCallback(() => {
    setCamReady(true);
  }, []);

  /* Capture loop ── runs every 1.5 s while active */
  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(async () => {
      try {
        const screenshot = webcamRef.current?.getScreenshot?.();
        if (screenshot) {
          const result = await sendFrameToFlask(screenshot, language);
          setDetected(result.label);
          setConfidence(result.confidence);
          setTranscript(prev => [...prev, result.label]);
          setRecognitionError('');
          await saveSignHistory(result.label);
        }
      } catch (err) {
        setRecognitionError(apiErrorMessage(err, 'Sign recognition is unavailable right now.'));
      }
    }, 1500);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isActive, language]);

  const handleStart = () => setIsActive(true);
  const handlePause = () => {
    setIsActive(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };
  const handleClear = () => {
    setTranscript([]);
    setDetected('—');
    setConfidence(0);
  };

  const scrollToCamera = () => {
    document.getElementById('camera-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="sign-body">
      <div className="sign-page">

        {/* ═══════════════════════════════════════
            LEFT PANEL
        ═══════════════════════════════════════ */}
        <aside className="left-panel" aria-label="Saksham AI Sign Recognition sidebar">

          {/* Brand */}
          <div className="brand-logo">
            <span className="brand-icon" aria-hidden="true">🤟</span>
            <h1>SAKSHAM AI</h1>
          </div>

          <p className="left-subtitle">For Deaf Users</p>

          <p className="left-description">
            Empowering Communication Through Sign Language Recognition
          </p>

          {/* Illustration */}
          <div
            className="illustration"
            role="img"
            aria-label="Sign language illustration"
          >
            <span className="illus-hands">🖐️🤟✋</span>
            <span className="illus-label">SIGN LANGUAGE</span>
          </div>

          <button
            id="btn-live-recognition"
            className="btn-cta"
            onClick={scrollToCamera}
          >
            📷 LIVE SIGN RECOGNITION
          </button>

          <Link to="/dashboard" style={{ width: '100%' }}>
            <button className="btn-back">← Back to Dashboard</button>
          </Link>
        </aside>

        {/* ═══════════════════════════════════════
            RIGHT PANEL
        ═══════════════════════════════════════ */}
        <main className="right-panel" aria-label="Sign recognition main area">

          {/* ── TOP: Camera ─────────────────── */}
          <section
            id="camera-section"
            className="camera-section"
            aria-label="Live webcam feed"
          >
            <div className="section-header">
              <h2 className="section-title">📷 Live Feed</h2>
              <span className="section-badge">{language}</span>
            </div>

            {recognitionError && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  color: 'var(--red-dot)',
                  fontSize: 18,
                  letterSpacing: 1,
                }}
              >
                {recognitionError}
              </div>
            )}

            <div className="camera-box">
              <CameraFeed ref={webcamRef} onUserMedia={onUserMedia} />

              {/* Scan-line animation when active */}
              {isActive && <div className="camera-scan-line" aria-hidden="true" />}

              {/* Overlay when camera not yet ready */}
              {!camReady && (
                <div className="camera-inactive-overlay" aria-live="polite">
                  <span className="cam-icon">📷</span>
                  <p>Requesting camera access…</p>
                </div>
              )}
            </div>

            {/* Confidence strip */}
            <div className="confidence-strip" aria-label="Detection confidence">
              <span className="conf-label">DETECTED</span>
              <span className="conf-value">{detected}</span>
              <span className="conf-label">CONFIDENCE</span>
              <span className="conf-value">{Math.round(confidence * 100)}%</span>
              <div className="conf-bar-wrap" aria-hidden="true">
                <div
                  className="conf-bar"
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* ── MIDDLE: Transcript ──────────── */}
          <section className="output-section" aria-label="Recognized text output">
            <div className="section-header">
              <h2 className="section-title">💬 Message Output</h2>
            </div>
            <TranscriptBox transcript={transcript} />
            <div ref={transcriptEndRef} />
          </section>

          {/* ── BOTTOM: Controls ────────────── */}
          <ControlPanel
            onStart={handleStart}
            onPause={handlePause}
            onClear={handleClear}
            isActive={isActive}
            language={language}
            setLanguage={setLanguage}
          />

        </main>
      </div>
    </div>
  );
}
