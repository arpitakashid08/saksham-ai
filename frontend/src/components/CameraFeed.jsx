import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';
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
      
      <div className="camera-overlay-br" aria-hidden="true" />
      
      <div className="camera-overlay-bl" aria-hidden="true" />
    </>
  );
});

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
