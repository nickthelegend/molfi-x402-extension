import { ApiClient } from "./client";

export type AdSlot = {
  sessionId: string;
  nonceHex: string;
  campaignId: number;
  kind: "TEXT" | "IMAGE" | "VIDEO";
  contentURI: string;
  thumbnailCid?: string;
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl: string;
  durationMs: number;
  rewardUsdc: string;
  type: "video" | "image";
};

export async function fetchNextAd(client: ApiClient, surface: "extension"): Promise<AdSlot | null> {
  const res = await client.fetch(`/v1/ads/start`, {
    method: "POST",
    body: JSON.stringify({
      surface,
      kind: "video", // Request video ad
    }),
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Fetch ad slot failed: ${res.status}`);
  const data = (await res.json()) as any;
  return {
    ...data,
    type: "video",
  };
}

export async function claimAd(
  client: ApiClient,
  body: {
    sessionId: string;
    heartbeats: any[];
    watchedMs: number;
  }
) {
  const res = await client.fetch("/v1/ads/claim", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as any;
    throw new Error(errorJson.error || `Claim ad failed: ${res.status}`);
  }
  return res.json();
}
