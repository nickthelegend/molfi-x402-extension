import React from "react";
import { postToHost } from "../lib/messageBus";

export function WalletPill({
  address,
  credits,
  usdcCents,
  onEarnCredits,
}: {
  address: string;
  credits: number;
  usdcCents: number;
  onEarnCredits: () => void;
}) {
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "No Wallet Linked";

  const formattedUsdc = (usdcCents / 100).toFixed(2);

  return (
    <div className="top-bar">
      <div className="wallet-pill">
        <span
          className="wallet-address"
          onClick={() => postToHost({ type: "wallet.show" })}
          title="Click to view wallet address details"
          style={{ cursor: "pointer", textDecoration: "underline" }}
        >
          💳 {shortAddress}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="wallet-credits" title="Credits available">
            🪙 {credits} cr
          </span>
          <span className="wallet-usdc" title="USDC balance">
            💵 ${formattedUsdc}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={onEarnCredits}
          style={{ flex: 1, padding: "4px 8px", fontSize: "11px" }}
        >
          🎬 Earn Credits
        </button>
        <button
          onClick={() => postToHost({ type: "topup.start", amountUsdc: 1.0 })}
          style={{ flex: 1, padding: "4px 8px", fontSize: "11px" }}
        >
          💸 Top Up $1
        </button>
      </div>
    </div>
  );
}
