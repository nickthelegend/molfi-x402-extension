import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ChatMessage } from "../hooks/useMessages";
import { postToHost } from "../lib/messageBus";

export function MessageList({
  messages,
  streamingId,
}: {
  messages: ChatMessage[];
  streamingId: string | null;
}) {
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleInsertCode = (code: string) => {
    postToHost({ type: "code.insert", code });
  };

  const renderers = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match ? match[1] : "";
      const codeString = String(children).replace(/\n$/, "");

      if (inline) {
        return <code className={className} {...props}>{children}</code>;
      }

      return (
        <div style={{ position: "relative" }}>
          <div className="code-toolbar">
            <button className="code-tool-btn" onClick={() => handleCopyCode(codeString)}>
              Copy
            </button>
            <button className="code-tool-btn" onClick={() => handleInsertCode(codeString)}>
              Insert
            </button>
          </div>
          <pre className={className}>
            <code {...props}>{children}</code>
          </pre>
        </div>
      );
    },
  };

  return (
    <div className="messages-list">
      {messages.map((m) => (
        <div key={m.id} className={`message-item ${m.role} ${m.error ? "error" : ""}`}>
          <div className="message-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={renderers}
            >
              {m.content}
            </ReactMarkdown>
            {m.id === streamingId && <span className="blinking-caret">▋</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
