import { useState, useEffect } from "react";
import { onHostMessage, postToHost } from "../lib/messageBus";

export function useCredits() {
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<{ credits: number; usdcCents: number }>({
    credits: 0,
    usdcCents: 0,
  });

  useEffect(() => {
    return onHostMessage((msg) => {
      if (msg.type === "init") {
        setAddress(msg.address);
        setBalance(msg.balance);
      } else if (msg.type === "balance.update") {
        setBalance(msg.balance);
      }
    });
  }, []);

  const refresh = () => {
    postToHost({ type: "balance.refresh" });
  };

  return { address, balance, refresh };
}
