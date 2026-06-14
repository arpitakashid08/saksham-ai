import React from 'react';

export default function TranscriptBox({ transcript }) {
  const hasContent = Array.isArray(transcript) && transcript.length > 0;

  return (
    <div
      className="transcript-area"
      aria-live="polite"
      aria-label="Sign language transcript output"
      role="log"
    >
      {hasContent ? (
        transcript.map((word, i) => (
          <span key={i} className="transcript-line">
            {word}
          </span>
        ))
      ) : (
        <span className="transcript-empty">[ Transcript will appear here ]</span>
      )}
    </div>
  );
}
