import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';

/**
 * CameraFeed
 * Wraps react-webcam with forwardRef so the parent can call
 * webcamRef.current.getScreenshot() for frame capture.
 *
 * Future hook: replace Webcam with a MediaPipe canvas feed here.
 */
const CameraFeed = forwardRef(function CameraFeed(
  { mirrored = true, onUserMedia },
  ref
) {
  return (
    <>
      <Webcam
        audio={false}
        ref={ref}
        mirrored={mirrored}
        videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
        onUserMedia={onUserMedia}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.8}
      />
      {/* decorative bottom-right corner bracket */}
      <div className="camera-overlay-br" aria-hidden="true" />
      {/* decorative bottom-left corner bracket */}
      <div className="camera-overlay-bl" aria-hidden="true" />
    </>
  );
});

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
