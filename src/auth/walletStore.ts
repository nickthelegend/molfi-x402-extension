import * as vscode from "vscode";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const KEY_PK = "molfi_agent_private_key";

export class WalletStore {
  constructor(private ctx: vscode.ExtensionContext) {}

  async getOrCreate(): Promise<`0x${string}`> {
    let pk = await this.ctx.secrets.get(KEY_PK);
    if (!pk) {
      pk = generatePrivateKey();
      await this.ctx.secrets.store(KEY_PK, pk);
    }
    return pk as `0x${string}`;
  }

  async getAddress(): Promise<string> {
    const pk = await this.getOrCreate();
    return privateKeyToAccount(pk).address;
  }

  async account() {
    return privateKeyToAccount(await this.getOrCreate());
  }

  async clear() {
    await this.ctx.secrets.delete(KEY_PK);
  }
}
