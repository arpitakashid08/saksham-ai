import React from 'react';

/**
 * TranscriptBox
 * Renders each recognised sign word on its own animated line.
 * aria-live="polite" makes screen-readers announce new words.
 */
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
