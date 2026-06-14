import React from 'react';
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

        
        <button
          id="btn-clear-transcript"
          className="ctrl-btn clear"
          onClick={onClear}
          title="Clear transcript"
        >
          ✕ CLEAR
        </button>

        
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

        
        <div className="status-pill" aria-label={isActive ? 'Recognition active' : 'Recognition paused'}>
          <span className={`status-dot ${isActive ? 'active' : 'paused'}`} />
          {isActive ? 'ACTIVE' : 'PAUSED'}
        </div>
      </div>
    </div>
  );
}
