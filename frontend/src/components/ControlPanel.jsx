import React from 'react';

/**
 * ControlPanel
 * Provides: Start / Pause / Clear buttons, status indicator dot,
 * and language dropdown (ISL / ASL).
 *
 * Future hook: onStart / onPause will trigger Flask API calls.
 */
export default function ControlPanel({
  onStart,
  onPause,
  onClear,
  isActive,
  language,
  setLanguage,
}) {
  return (
    <div className="controls-section">
      <div className="section-header">
        <h3 className="section-title">Controls</h3>
      </div>

      <div className="controls-row">
        {/* Start */}
        <button
          id="btn-start-recognition"
          className="ctrl-btn start"
          onClick={onStart}
          aria-pressed={isActive}
          disabled={isActive}
          title="Start sign recognition"
        >
          ▶ START
        </button>

        {/* Pause */}
        <button
          id="btn-pause-recognition"
          className="ctrl-btn pause"
          onClick={onPause}
          aria-pressed={!isActive}
          disabled={!isActive}
          title="Pause sign recognition"
        >
          ⏸ PAUSE
        </button>

        {/* Clear */}
        <button
          id="btn-clear-transcript"
          className="ctrl-btn clear"
          onClick={onClear}
          title="Clear transcript"
        >
          ✕ CLEAR
        </button>

        {/* Language Dropdown */}
        <select
          id="language-select"
          className="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Select sign language"
        >
          <option value="ISL">Indian Sign Language (ISL)</option>
          <option value="ASL">American Sign Language (ASL)</option>
        </select>

        {/* Status pill */}
        <div className="status-pill" aria-label={isActive ? 'Recognition active' : 'Recognition paused'}>
          <span className={`status-dot ${isActive ? 'active' : 'paused'}`} />
          {isActive ? 'ACTIVE' : 'PAUSED'}
        </div>
      </div>
    </div>
  );
}
