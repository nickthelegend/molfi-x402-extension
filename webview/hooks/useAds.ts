import { useState, useEffect } from "react";
import { onHostMessage, postToHost } from "../lib/messageBus";

export function useAds(creditJwtRef: React.MutableRefObject<string | null>) {
  const [backendUrl, setBackendUrl] = useState<string>("http://localhost:8787");
  const [activeTextAd, setActiveTextAd] = useState<any | null>(null);
  const [activeVideoAd, setActiveVideoAd] = useState<any | null>(null);
  const [isAdClaimed, setIsAdClaimed] = useState(false);

  useEffect(() => {
    return onHostMessage((msg) => {
      if (msg.type === "init") {
        setBackendUrl(msg.backendUrl);
      } else if (msg.type === "ad.text") {
        setActiveTextAd(msg.ad);
        setIsAdClaimed(false);
      } else if (msg.type === "ad.video") {
        setActiveVideoAd(msg.ad);
        setIsAdClaimed(false);
      } else if (msg.type === "ad.claimed") {
        if (msg.creditJwt) {
          creditJwtRef.current = msg.creditJwt;
        }
        setIsAdClaimed(true);
        setActiveTextAd(null);
        setActiveVideoAd(null);
      }
    });
  }, []);

  const requestNextAd = (kind: "text" | "video") => {
    postToHost({ type: "ad.requestNext", kind });
  };

  const claimTextAd = (impressionToken: string, durationMs: number) => {
    // Legacy support or fallback
    postToHost({
      type: "ad.claim",
      sessionId: impressionToken,
      nonceHex: "",
      heartbeats: [],
      watchedMs: durationMs,
    });
  };

  const claimVideoAd = (sessionId: string, nonceHex: string, heartbeats: any[], watchedMs: number) => {
    postToHost({
      type: "ad.claim",
      sessionId,
      nonceHex,
      heartbeats,
      watchedMs,
    });
  };

  const dismissTextAd = () => {
    setActiveTextAd(null);
  };

  const dismissVideoAd = () => {
    setActiveVideoAd(null);
  };

  return {
    backendUrl,
    activeTextAd,
    activeVideoAd,
    isAdClaimed,
    requestNextAd,
    claimTextAd,
    claimVideoAd,
    dismissTextAd,
    dismissVideoAd,
  };
}
