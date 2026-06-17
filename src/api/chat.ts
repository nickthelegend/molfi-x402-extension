import { ApiClient } from "./client";
import { WalletStore } from "../auth/walletStore";
import { signEip3009 } from "../payments/wallet.js";
import { getConfig } from "../util/config";

export async function* streamChat(
  client: ApiClient,
  walletStore: WalletStore,
  body: {
    model: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    context?: { filePath?: string; selection?: string; language?: string };
    creditJwt?: string;
  }
): AsyncGenerator<{ type: "token" | "done" | "credit" | "ad" | "error"; data: any }> {
  // 1. Initial Request
  let res: Response;
  try {
    const headers: Record<string, string> = {};
    if (body.creditJwt) {
      headers["Authorization"] = `Bearer ${body.creditJwt}`;
    }
    res = await client.fetch("/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        context: body.context,
      }),
    });
  } catch (err: any) {
    yield { type: "error", data: `Fetch error: ${err.message}` };
    return;
  }

  // 2. Handle 402 Redirect
  if (res.status === 402) {
    try {
      const errorJson = (await res.json()) as any;
      const accepts = errorJson.accepts?.[0];
      if (!accepts) {
        yield { type: "error", data: "Payment required but accepts payload missing." };
        return;
      }

      const { maxAmountRequired, payTo, asset } = accepts;
      const pk = await walletStore.getOrCreate();

      // Sign using the existing helper
      const paymentData = await signEip3009(
        pk,
        payTo,
        maxAmountRequired,
        asset,
        43113
      );

      const xPaymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: "avalanche-fuji",
        payload: paymentData,
      };

      const xPaymentBase64 = Buffer.from(JSON.stringify(xPaymentPayload)).toString("base64");

      res = await client.fetch("/v1/chat/completions", {
        method: "POST",
        headers: {
          "X-PAYMENT": xPaymentBase64,
          "Authorization": "",
        },
        body: JSON.stringify({
          model: body.model,
          messages: body.messages,
          context: body.context,
        }),
      });
    } catch (err: any) {
      yield { type: "error", data: `Payment settlement failed: ${err.message}` };
      return;
    }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    yield { type: "error", data: `chat http ${res.status}: ${errText}` };
    return;
  }

  if (!res.body) {
    yield { type: "error", data: "Completions stream is empty." };
    return;
  }

  const txHeader = res.headers.get("x-payment-response");
  let txHash = "";
  if (txHeader) {
    try {
      const decoded = JSON.parse(Buffer.from(txHeader, "base64").toString("utf-8"));
      txHash = decoded.transaction;
      yield { type: "credit", data: { txHash } }; // Emit payment event
    } catch (e) {
      // ignore
    }
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("data: ")) {
        const payload = trimmed.slice(6).trim();
        if (payload === "[DONE]") {
          yield { type: "done", data: null };
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.molfiMetadata) {
            yield { type: "credit", data: parsed.molfiMetadata };
          } else if (parsed.choices?.[0]?.delta?.content) {
            yield { type: "token", data: parsed.choices[0].delta.content };
          }
        } catch {
          // ignore
        }
      }
    }
  }
}
