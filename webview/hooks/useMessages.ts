import { useState, useEffect, useRef } from "react";
import { onHostMessage, postToHost } from "../lib/messageBus";

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  error?: boolean;
};

export function useMessages(creditJwtRef: React.MutableRefObject<string | null>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    return onHostMessage((msg) => {
      if (msg.type === "chat.token") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.messageId ? { ...m, content: m.content + msg.chunk } : m
          )
        );
      } else if (msg.type === "chat.done") {
        setStreamingId(null);
      } else if (msg.type === "chat.error") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.messageId ? { ...m, content: `❌ ${msg.error}`, error: true } : m
          )
        );
        setStreamingId(null);
      } else if (msg.type === "chat.reset") {
        setMessages([]);
        setStreamingId(null);
      }
    });
  }, []);

  const send = (text: string, model: string, context?: any) => {
    const userId = crypto.randomUUID();
    const asstId = crypto.randomUUID();
    
    // Add user message and empty assistant message
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: text },
      { id: asstId, role: "assistant", content: "" },
    ]);
    setStreamingId(asstId);

    // Collect message history (convert format)
    const history = messagesRef.current.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Post to host
    postToHost({
      type: "chat.send",
      messageId: asstId,
      model,
      messages: [...history, { role: "user", content: text }],
      context,
      creditJwt: creditJwtRef.current,
    });

    // Burn/clear the single-use creditJwt since it's now consumed
    creditJwtRef.current = null;
  };

  const cancel = (messageId: string) => {
    postToHost({ type: "chat.cancel", messageId });
    setStreamingId(null);
  };

  return { messages, send, cancel, streamingId, setMessages };
}
