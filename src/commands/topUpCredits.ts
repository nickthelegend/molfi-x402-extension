import * as vscode from "vscode";
import { ApiClient } from "../api/client";
import { WalletStore } from "../auth/walletStore";
import { signEip3009 } from "../payments/wallet.js";
import { getBalance } from "../api/credits";

export async function topUpFlow(client: ApiClient, walletStore: WalletStore) {
  const pick = await vscode.window.showQuickPick(
    [
      { label: "$1.00", description: "Top up 1.00 USDC (adds 10 credits)", value: 1.0 },
      { label: "$5.00", description: "Top up 5.00 USDC (adds 50 credits)", value: 5.0 },
      { label: "$10.00", description: "Top up 10.00 USDC (adds 100 credits)", value: 10.0 },
      { label: "Custom", description: "Enter custom USDC amount", value: -1 },
    ],
    { placeHolder: "Select top up amount" }
  );

  if (!pick) return;

  let amount = pick.value;
  if (amount === -1) {
    const input = await vscode.window.showInputBox({
      prompt: "Enter custom amount in USDC (e.g. 2.50)",
      validateInput: (val) => {
        return /^\d+(\.\d{1,6})?$/.test(val) ? null : "Enter a valid decimal USDC amount";
      },
    });
    if (!input) return;
    amount = parseFloat(input);
  }

  const initialBalance = await getBalance(client);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Top up starting: ${amount.toFixed(2)} USDC...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "Fetching top-up quote from backend..." });

      const quoteRes = await client.fetch("/v1/marketers/billing/topup-quote", {
        method: "POST",
        body: JSON.stringify({ amountUsdc: amount.toFixed(6) }),
      });

      if (quoteRes.status !== 402) {
        throw new Error(`Unexpected quote response status: ${quoteRes.status}`);
      }

      const errorJson = (await quoteRes.json()) as any;
      const accepts = errorJson.accepts?.[0];
      if (!accepts) {
        throw new Error("Payment quote required but accepts details are missing.");
      }

      const { maxAmountRequired, payTo, asset } = accepts;

      progress.report({ message: "Signing EIP-3009 authorization..." });

      const pk = await walletStore.getOrCreate();
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

      progress.report({ message: "Submitting payment transaction..." });

      const topupRes = await client.fetch("/v1/marketers/billing/topup", {
        method: "POST",
        headers: {
          "X-PAYMENT": xPaymentBase64,
        },
        body: JSON.stringify({ amountUsdc: amount.toFixed(6) }),
      });

      if (!topupRes.ok) {
        const errJson = (await topupRes.json().catch(() => ({}))) as any;
        throw new Error(errJson.error || `Topup failed: ${topupRes.status}`);
      }

      const { txHash } = (await topupRes.json()) as any;

      progress.report({ message: "Verifying credits balance increment..." });

      // Poll balance for up to 30 seconds
      let balanceUpdated = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const currentBalance = await getBalance(client);
        if (currentBalance.credits > initialBalance.credits) {
          balanceUpdated = true;
          vscode.window.showInformationMessage(
            `Successfully topped up ${amount.toFixed(2)} USDC! credits balance updated to ${currentBalance.credits}cr.`
          );
          break;
        }
      }

      if (!balanceUpdated) {
        vscode.window.showWarningMessage(
          `USDC top-up tx settled on-chain (${txHash.slice(0, 10)}...), but credits balance took longer than expected to update. Try refreshing shortly.`
        );
      }
    }
  ).then(undefined, (err) => {
    vscode.window.showErrorMessage(`Top-up failed: ${err.message}`);
  });
}
