import * as vscode from "vscode";
import { ApiClient } from "../api/client";
import { WalletStore } from "../auth/walletStore";
import { streamChat } from "../api/chat";
import { fetchNextAd, claimAd } from "../api/ads";
import { getBalance } from "../api/credits";
import { ModelEntry, fetchModels } from "../api/models";
import { insertAtCursor, captureSelection, captureActiveFile } from "../context/editorContext";
import { StatusBar } from "../status/statusBar";

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  error?: boolean;
};

export type HostToWebview =
  | { type: "init"; address: string; balance: { credits: number; usdcCents: number }; models: ModelEntry[]; defaultModel: string; backendUrl: string }
  | { type: "chat.token"; messageId: string; chunk: string }
  | { type: "chat.done"; messageId: string }
  | { type: "chat.error"; messageId: string; error: string }
  | { type: "balance.update"; balance: { credits: number; usdcCents: number } }
  | { type: "ad.text"; ad: any }
  | { type: "ad.video"; ad: any }
  | { type: "ad.claimed"; creditsEarned: number; creditJwt?: string }
  | { type: "context.attached"; filePath: string; selection?: string; language?: string; promptHint?: string }
  | { type: "model.set"; modelId: string };

export type WebviewToHost =
  | { type: "chat.send"; messageId: string; model: string; messages: any[]; context?: any; creditJwt?: string | null }
  | { type: "chat.cancel"; messageId: string }
  | { type: "model.change"; modelId: string }
  | { type: "ad.requestNext"; kind: "text" | "video" }
  | { type: "ad.claim"; sessionId: string; nonceHex: string; heartbeats: any[]; watchedMs: number }
  | { type: "balance.refresh" }
  | { type: "wallet.show" }
  | { type: "topup.start"; amountUsdc: number }
  | { type: "code.insert"; code: string; language?: string }
  | { type: "context.request"; contextType: "file" | "selection" }
  | { type: "ready" }
  | { type: "log"; level: "info" | "warn" | "error"; message: string };

export class MessageBus {
  private activeCancellationTokenSources = new Map<string, vscode.CancellationTokenSource>();
  private provider?: any;

  constructor(
    public api: ApiClient,
    public wallet: WalletStore,
    private statusBar: StatusBar
  ) {}

  bind(provider: any) {
    this.provider = provider;
  }

  async handleFromWebview(msg: WebviewToHost, provider: any) {
    switch (msg.type) {
      case "chat.send":
        await this.handleChatSend(msg, provider);
        break;
      case "chat.cancel":
        this.handleChatCancel(msg);
        break;
      case "model.change":
        // Save selected model to config
        await vscode.workspace.getConfiguration("molfi").update("defaultModel", msg.modelId, vscode.ConfigurationTarget.Global);
        this.statusBar.update(msg.modelId, (await getBalance(this.api)).credits);
        break;
      case "ad.requestNext":
        await this.handleAdRequest(msg, provider);
        break;
      case "ad.claim":
        await this.handleAdClaim(msg, provider);
        break;
      case "balance.refresh":
        await this.refreshBalance(provider);
        break;
      case "ready":
        await this.sendInitData(provider);
        break;
      case "wallet.show":
        await vscode.commands.executeCommand("molfi.showWallet");
        break;
      case "topup.start":
        await vscode.commands.executeCommand("molfi.topUpCredits", msg.amountUsdc);
        break;
      case "code.insert":
        await insertAtCursor(msg.code);
        break;
      case "context.request":
        if (msg.contextType === "selection") {
          const sel = captureSelection();
          if (sel) {
            provider.postToWebview({
              type: "context.attached",
              filePath: sel.filePath || "active selection",
              selection: sel.selection,
              language: sel.language,
            });
          } else {
            vscode.window.showWarningMessage("No selection found in active editor.");
          }
        } else {
          const f = captureActiveFile();
          if (f) {
            provider.postToWebview({
              type: "context.attached",
              filePath: f.filePath || "active file",
              selection: f.content,
              language: f.language,
            });
          } else {
            vscode.window.showWarningMessage("No active text file open.");
          }
        }
        break;
      case "log":
        console.log(`[webview ${msg.level}] ${msg.message}`);
        break;
    }
  }

  private async handleChatSend(msg: Extract<WebviewToHost, { type: "chat.send" }>, provider: any) {
    const cts = new vscode.CancellationTokenSource();
    this.activeCancellationTokenSources.set(msg.messageId, cts);

    try {
      const generator = streamChat(this.api, this.wallet, {
        model: msg.model,
        messages: msg.messages,
        context: msg.context,
        creditJwt: msg.creditJwt || undefined,
      });

      for await (const evt of generator) {
        if (cts.token.isCancellationRequested) {
          break;
        }

        if (evt.type === "token") {
          provider.postToWebview({ type: "chat.token", messageId: msg.messageId, chunk: evt.data });
        } else if (evt.type === "done") {
          provider.postToWebview({ type: "chat.done", messageId: msg.messageId });
          await this.refreshBalance(provider);
        } else if (evt.type === "error") {
          provider.postToWebview({ type: "chat.error", messageId: msg.messageId, error: evt.data });
        }
      }
    } catch (err: any) {
      provider.postToWebview({ type: "chat.error", messageId: msg.messageId, error: err.message });
    } finally {
      this.activeCancellationTokenSources.delete(msg.messageId);
    }
  }

  private handleChatCancel(msg: Extract<WebviewToHost, { type: "chat.cancel" }>) {
    const cts = this.activeCancellationTokenSources.get(msg.messageId);
    if (cts) {
      cts.cancel();
      this.activeCancellationTokenSources.delete(msg.messageId);
    }
  }

  private async handleAdRequest(msg: Extract<WebviewToHost, { type: "ad.requestNext" }>, provider: any) {
    try {
      const ad = await fetchNextAd(this.api, "extension");
      if (ad) {
        if (ad.type === "video") {
          provider.postToWebview({ type: "ad.video", ad });
        } else {
          provider.postToWebview({ type: "ad.text", ad });
        }
      } else {
        provider.postToWebview({ type: "ad.claimed", creditsEarned: 0 });
      }
    } catch (err) {
      console.error("Ad request failed:", err);
    }
  }

  private async handleAdClaim(msg: Extract<WebviewToHost, { type: "ad.claim" }>, provider: any) {
    try {
      const account = await this.wallet.account();
      const heartbeats = msg.heartbeats;

      const hbMessage = (sessionId: string, nonceHex: string, hb: any) => {
        return [
          "molfi:hb:v1",
          sessionId,
          nonceHex,
          String(hb.t),
          Number(hb.currentTime).toFixed(3),
          hb.paused ? "1" : "0",
          hb.muted ? "1" : "0",
          hb.visible ? "1" : "0",
          hb.focused ? "1" : "0",
        ].join("|");
      };

      if (heartbeats.length > 0) {
        // Sign first heartbeat
        const first = heartbeats[0];
        const firstMsg = hbMessage(msg.sessionId, msg.nonceHex, first);
        first.sig = await account.signMessage({ message: firstMsg });

        // Sign last heartbeat
        const last = heartbeats[heartbeats.length - 1];
        const lastMsg = hbMessage(msg.sessionId, msg.nonceHex, last);
        last.sig = await account.signMessage({ message: lastMsg });
      }

      const result = (await claimAd(this.api, {
        sessionId: msg.sessionId,
        heartbeats,
        watchedMs: msg.watchedMs,
      })) as any;

      if (result && result.jwt) {
        provider.postToWebview({ type: "ad.claimed", creditsEarned: 5, creditJwt: result.jwt });
        await this.refreshBalance(provider);
      }
    } catch (err: any) {
      console.error("Ad claim failed:", err);
      provider.postToWebview({ type: "chat.error", messageId: "ad-error", error: `Ad Claim Rejected: ${err.message}` });
    }
  }

  async refreshBalance(provider: any) {
    const bal = await getBalance(this.api);
    provider.postToWebview({ type: "balance.update", balance: bal });
    const cfg = vscode.workspace.getConfiguration("molfi");
    const activeModel = cfg.get<string>("defaultModel", "llama-3.3-70b");
    this.statusBar.update(activeModel, bal.credits);
  }

  async sendInitData(provider: any) {
    try {
      const address = await this.wallet.getAddress();
      const bal = await getBalance(this.api);
      const models = await fetchModels(this.api);
      const cfg = vscode.workspace.getConfiguration("molfi");
      const defaultModel = cfg.get<string>("defaultModel", "llama-3.3-70b");
      const backendUrl = cfg.get<string>("backendUrl", "http://localhost:8787");

      provider.postToWebview({
        type: "init",
        address,
        balance: bal,
        models,
        defaultModel,
        backendUrl,
      });
    } catch (err) {
      console.error("Failed to send init data:", err);
    }
  }
}
