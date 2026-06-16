import React, { useState, useRef, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { ContextChip } from "./ContextChip";

export function MessageInput({
  onSend,
  onClear,
  onAttachContext,
  attachedContext,
  onRemoveContext,
  text,
  setText,
}: {
  onSend: (text: string, context?: any) => void;
  onClear: () => void;
  onAttachContext: (type: "file" | "selection") => void;
  attachedContext: { type: "file" | "selection"; label: string; data: any } | null;
  onRemoveContext: () => void;
  text: string;
  setText: (text: string) => void;
}) {
  const [showPalette, setShowPalette] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPalette) {
      const commandsFiltered = ["/clear", "/model", "/file", "/selection", "/wallet", "/topup"];
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIndex((prev) => (prev + 1) % commandsFiltered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIndex((prev) => (prev - 1 + commandsFiltered.length) % commandsFiltered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = commandsFiltered[paletteIndex];
        handleSelectCommand(selected);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPalette(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectCommand = (cmd: string) => {
    if (cmd === "/clear") {
      onClear();
      setText("");
    } else if (cmd === "/file") {
      onAttachContext("file");
      setText("");
    } else if (cmd === "/selection") {
      onAttachContext("selection");
      setText("");
    } else if (cmd === "/wallet") {
      const { postToHost } = require("../lib/messageBus");
      postToHost({ type: "wallet.show" });
      setText("");
    } else if (cmd === "/topup") {
      const { postToHost } = require("../lib/messageBus");
      postToHost({ type: "topup.start", amountUsdc: 1.0 });
      setText("");
    } else {
      setText(cmd + " ");
    }
    setShowPalette(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const match = /\/(\w*)$/.exec(val);
    if (match) {
      setShowPalette(true);
      setPaletteFilter(match[0]);
      setPaletteIndex(0);
    } else {
      setShowPalette(false);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("/")) {
      handleSelectCommand(trimmed.split(" ")[0]);
      return;
    }

    onSend(trimmed, attachedContext ? attachedContext.data : undefined);
    setText("");
    onRemoveContext();
  };

  return (
    <div className="input-area">
      {attachedContext && (
        <div className="context-chips">
          <ContextChip
            label={`${attachedContext.type.toUpperCase()}: ${attachedContext.label}`}
            onClose={onRemoveContext}
          />
        </div>
      )}
      <div className="input-box-row">
        {showPalette && (
          <CommandPalette
            filter={paletteFilter}
            activeIndex={paletteIndex}
            onSelect={handleSelectCommand}
          />
        )}
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Ask Molfi... (type / for commands)"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="send-button" onClick={handleSend} disabled={!text.trim() && !attachedContext}>
          Send
        </button>
      </div>
    </div>
  );
}
