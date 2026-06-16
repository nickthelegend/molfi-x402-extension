import React, { useState, useEffect, useRef } from "react";

export function VideoAdModal({
  ad,
  backendUrl,
  onComplete,
  onSkip,
}: {
  ad: any;
  backendUrl: string;
  onComplete: (watchedMs: number) => void;
  onSkip: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seqRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => {
        setSecondsLeft(secondsLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanSkip(true);
    }
  }, [secondsLeft]);

  useEffect(() => {
    if (!videoRef.current) return;
    const interval = setInterval(async () => {
      if (!videoRef.current) return;
      const elapsedMs = Date.now() - startTimeRef.current;
      const evidence = {
        videoCurrentTimeMs: Math.round(videoRef.current.currentTime * 1000),
        videoPaused: videoRef.current.paused,
        videoMuted: videoRef.current.muted,
      };

      try {
        await fetch(`${backendUrl}/v1/ads/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            impressionToken: ad.impressionToken,
            seq: seqRef.current++,
            elapsedMs,
            visibility: "visible",
            evidence,
          }),
        });
      } catch (err) {
        console.warn("Heartbeat failed:", err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [backendUrl, ad]);

  const handleEnded = () => {
    const elapsed = Date.now() - startTimeRef.current;
    onComplete(elapsed);
  };

  return (
    <div className="video-ad-overlay">
      <div className="video-ad-modal">
        <div className="video-ad-title">Watching Sponsor Ad to Earn Credits</div>
        <video
          ref={videoRef}
          src={ad.mp4Url}
          autoPlay
          muted
          playsInline
          controls={false}
          className="video-ad-player"
          onEnded={handleEnded}
        />
        <div className="video-ad-footer">
          {canSkip ? (
            <button className="video-ad-skip-btn" onClick={onSkip}>
              Skip Ad
            </button>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>
              Can skip in {secondsLeft}s...
            </span>
          )}
          <span style={{ color: "var(--accent)" }}>Earn 1 Credit on Completion</span>
        </div>
      </div>
    </div>
  );
}
