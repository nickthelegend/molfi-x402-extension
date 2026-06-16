import { ApiClient } from "./client";

export async function getBalance(client: ApiClient): Promise<{ credits: number; usdcCents: number }> {
  try {
    const creditsRes = await client.fetch("/v1/credits/balance");
    let credits = 0;
    if (creditsRes.ok) {
      const data = (await creditsRes.json()) as any;
      credits = data.credits || 0;
    }

    const marketerRes = await client.fetch("/v1/marketers/me");
    let usdcCents = 0;
    if (marketerRes.ok) {
      const data = (await marketerRes.json()) as any;
      const balanceUsdc = parseFloat(data.balanceUsdc || "0");
      usdcCents = Math.round(balanceUsdc * 100);
    }

    return { credits, usdcCents };
  } catch (err) {
    console.error("Failed to get balance:", err);
    return { credits: 0, usdcCents: 0 };
  }
}
