import React, { useState, useEffect } from "react";

export function TextAd({ ad, onClaim, onDismiss }: { ad: any; onClaim: () => void; onDismiss: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => {
        setSecondsLeft(secondsLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClaim(true);
    }
  }, [secondsLeft]);

  const handleCtaClick = () => {
    if (ad.ctaUrl) {
      window.open(ad.ctaUrl, "_blank");
    }
    onClaim();
  };

  return (
    <div className="text-ad-card">
      <div className="text-ad-header">
        <span>Sponsored</span>
        <span className="text-ad-close" onClick={onDismiss}>×</span>
      </div>
      <div>{ad.imageUrl ? <img src={ad.imageUrl} style={{ width: "100%", borderRadius: "4px", marginBottom: "4px" }} alt="Ad" /> : null}</div>
      <div style={{ fontWeight: "500" }}>{ad.title || "Avalanche Subnets"}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "10.5px" }}>{ad.description || "Deploy customizable app-specific blockchains with sub-second finality."}</div>
      {canClaim ? (
        <span className="text-ad-cta" onClick={handleCtaClick}>
          Claim 1 Credit Now ↗
        </span>
      ) : (
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          View for {secondsLeft}s to earn 1 credit...
        </span>
      )}
    </div>
  );
}
