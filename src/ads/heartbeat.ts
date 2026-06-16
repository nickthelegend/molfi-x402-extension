import { keccak256, toHex } from "viem";

export async function signHeartbeat(account: any, adId: string, watchedMs: number) {
  const digest = keccak256(toHex(`${adId}:${watchedMs}:${Date.now()}`));
  return account.signMessage({ message: { raw: digest } });
}
