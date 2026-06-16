import * as vscode from 'vscode';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, stringToHex } from 'viem';

export async function getOrCreateAgentWallet(secrets: vscode.SecretStorage) {
  let pkey = await secrets.get('molfi_agent_private_key');
  if (!pkey) {
    pkey = generatePrivateKey();
    await secrets.store('molfi_agent_private_key', pkey);
  }
  const account = privateKeyToAccount(pkey as `0x${string}`);
  return {
    address: account.address,
    privateKey: pkey,
  };
}

export async function signEip3009(
  privateKey: string,
  to: string,
  value: string,
  asset: string,
  chainId: number
) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const nonce = keccak256(stringToHex(`nonce-${Date.now()}-${Math.random()}`));
  const validAfter = 0;
  const validBefore = Math.floor(Date.now() / 1000) + 300;

  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId,
    verifyingContract: asset as `0x${string}`,
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: account.address,
      to: to as `0x${string}`,
      value: BigInt(value),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    },
  });

  return {
    signature,
    authorization: {
      from: account.address,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    },
  };
}
