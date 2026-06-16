import { WalletStore } from "./walletStore";
import { getConfig } from "../util/config";

const KEY_JWT = "molfi.session.jwt";

export class SiweClient {
  constructor(
    private ctx: import("vscode").ExtensionContext,
    private wallet: WalletStore
  ) {}

  async getJwt(force = false): Promise<string> {
    const cached = await this.ctx.secrets.get(KEY_JWT);
    if (cached && !force && !isExpired(cached)) return cached;
    return this.signIn();
  }

  private async signIn(): Promise<string> {
    const backend = getConfig().backendUrl;
    const account = await this.wallet.account();

    const nonceRes = await fetch(`${backend}/v1/marketers/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: account.address }),
    });
    if (!nonceRes.ok) throw new Error(`SIWE nonce failed: ${nonceRes.status}`);
    const { nonce } = (await nonceRes.json()) as any;

    const message = `localhost wants you to sign in with your Ethereum account:\n${account.address}\n\nSign in to Molfi Dev Companion\n\nURI: http://localhost\nVersion: 1\nChain ID: 43113\nNonce: ${nonce}`;

    const signature = await account.signMessage({ message });

    const verifyRes = await fetch(`${backend}/v1/marketers/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    if (!verifyRes.ok) throw new Error(`SIWE verify failed: ${verifyRes.status}`);
    const { sessionJwt } = (await verifyRes.json()) as any;

    await this.ctx.secrets.store(KEY_JWT, sessionJwt);
    return sessionJwt;
  }

  async signOut() {
    await this.ctx.secrets.delete(KEY_JWT);
  }
}

function isExpired(jwt: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString());
    return Date.now() / 1000 > (payload.exp ?? 0) - 60;
  } catch { return true; }
}
