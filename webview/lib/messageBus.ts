import { useVscode } from "../hooks/useVscode";

export function postToHost(msg: any) {
  useVscode().postMessage(msg);
}

export function onHostMessage(handler: (msg: any) => void) {
  const listener = (event: MessageEvent) => {
    handler(event.data);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
