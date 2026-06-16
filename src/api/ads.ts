import { ApiClient } from "./client";

export type AdSlot = {
  impressionId: string;
  impressionToken: string;
  campaignId: string;
  mp4Url: string;
  imageUrl: string;
  durationMs: number;
  bidPerViewUsdc: string;
  ctaUrl: string;
  heartbeatIntervalMs: number;
  type: "video" | "image";
};

export async function fetchNextAd(client: ApiClient, surface: "extension"): Promise<AdSlot | null> {
  const session = `session-${Date.now()}-${Math.random()}`;
  const res = await client.fetch(`/v1/ads/slot?slotId=sidebar&session=${session}&surface=${surface}`, {
    method: "POST",
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Fetch ad slot failed: ${res.status}`);
  const data = (await res.json()) as any;
  const isVideo = data.mp4Url && (data.mp4Url.toLowerCase().endsWith(".mp4") || data.mp4Url.toLowerCase().includes("uploads"));
  return {
    ...data,
    type: isVideo ? "video" : "image",
  };
}

export async function claimAd(
  client: ApiClient,
  body: {
    impressionToken: string;
    watchedMs: number;
    lastSeq: number;
    completionSig?: string;
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
