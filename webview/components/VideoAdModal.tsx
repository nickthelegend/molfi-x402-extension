import React, { useState, useEffect, useRef } from "react";

export function VideoAdModal({
  ad,
  onComplete,
  onSkip,
}: {
  ad: any;
  backendUrl: string;
  onComplete: (heartbeats: any[], watchedMs: number) => void;
  onSkip: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef(Date.now());
  const heartbeats = useRef<any[]>([]);

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

  // Local heartbeat collection loop (1000ms intervals)
  useEffect(() => {
    if (!videoRef.current) return;
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      const elapsedMs = Date.now() - startTimeRef.current;
      heartbeats.current.push({
        t: elapsedMs,
        currentTime: videoRef.current.currentTime,
        paused: videoRef.current.paused,
        muted: videoRef.current.muted,
        visible: document.visibilityState === "visible",
        focused: document.hasFocus(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ad]);

  // Block fast-forward and context menus
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.disablePictureInPicture = true;

    const onCtx = (e: Event) => e.preventDefault();
    const onRate = () => {
      v.playbackRate = 1.0;
    };

    v.addEventListener("contextmenu", onCtx);
    v.addEventListener("ratechange", onRate);

    return () => {
      v.removeEventListener("contextmenu", onCtx);
      v.removeEventListener("ratechange", onRate);
    };
  }, []);

  const handleEnded = () => {
    const elapsed = Date.now() - startTimeRef.current;
    // Ensure we have at least first and last heartbeats recorded
    if (heartbeats.current.length === 0 && videoRef.current) {
      heartbeats.current.push({
        t: 0,
        currentTime: 0,
        paused: false,
        muted: videoRef.current.muted,
        visible: true,
        focused: true,
      });
    }
    
    onComplete(heartbeats.current, elapsed);
  };

  return (
    <div className="video-ad-overlay">
      <div className="video-ad-modal bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl">
        <div className="video-ad-title text-sm font-bold text-text mb-2">Watching Sponsor Ad to Earn Credits</div>
        <video
          ref={videoRef}
          src={ad.contentURI || ad.mp4Url}
          autoPlay
          muted
          playsInline
          controls={false}
          className="video-ad-player rounded-lg border border-zinc-800 bg-black aspect-video w-full"
          onEnded={handleEnded}
        />
        <div className="video-ad-footer mt-3 flex items-center justify-between text-xs">
          {canSkip ? (
            <button className="video-ad-skip-btn bg-zinc-900 border border-zinc-800 text-text px-3 py-1 rounded" onClick={onSkip}>
              Skip Ad
            </button>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>
              Can skip in {secondsLeft}s...
            </span>
          )}
          <span style={{ color: "var(--accent)" }} className="font-semibold text-purple-400">Earn 5 Credits on Completion</span>
        </div>
      </div>
    </div>
  );
}
