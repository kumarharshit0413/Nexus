import React, { useEffect, useRef } from 'react';

const VideoPlayer = ({ stream, isMuted = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted={isMuted}
        className="w-full h-auto rounded-lg shadow-lg"
      />
    </div>
  );
};

export default VideoPlayer;