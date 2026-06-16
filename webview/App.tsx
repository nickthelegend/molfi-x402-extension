import React, { useRef, useState, useEffect } from "react";
import { useMessages } from "./hooks/useMessages";
import { useModels } from "./hooks/useModels";
import { useCredits } from "./hooks/useCredits";
import { useAds } from "./hooks/useAds";
import { ModelPicker } from "./components/ModelPicker";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { WalletPill } from "./components/WalletPill";
import { TextAd } from "./components/TextAd";
import { VideoAdModal } from "./components/VideoAdModal";
import { postToHost, onHostMessage } from "./lib/messageBus";

export default function App() {
  const creditJwtRef = useRef<string | null>(null);
  
  const { messages, send, cancel, streamingId, setMessages } = useMessages(creditJwtRef);
  const { models, selectedModel, changeModel } = useModels();
  const { address, balance, refresh } = useCredits();
  const {
    backendUrl,
    activeTextAd,
    activeVideoAd,
    requestNextAd,
    claimTextAd,
    claimVideoAd,
    dismissTextAd,
    dismissVideoAd,
  } = useAds(creditJwtRef);

  const [attachedContext, setAttachedContext] = useState<{
    type: "file" | "selection";
    label: string;
    data: any;
  } | null>(null);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    return onHostMessage((msg) => {
      if (msg.type === "context.attached") {
        setAttachedContext({
          type: msg.selection ? "selection" : "file",
          label: msg.filePath,
          data: {
            filePath: msg.filePath,
            selection: msg.selection,
            language: msg.language,
          },
        });
        if (msg.promptHint) {
          setInputText(msg.promptHint);
        }
      }
    });
  }, []);

  const handleAttachContext = (type: "file" | "selection") => {
    postToHost({ type: "context.request", contextType: type });
  };

  const handleSend = (text: string, context?: any) => {
    send(text, selectedModel, context || (attachedContext ? attachedContext.data : undefined));
    setAttachedContext(null);

    // If credits are low (< 3), request a video ad after a message is sent
    const cfg = balance.credits;
    if (cfg < 3) {
      requestNextAd("video");
    } else {
      requestNextAd("text");
    }
  };

  const handleClear = () => {
    setMessages([]);
    postToHost({ type: "chat.cancel", messageId: "all" });
  };

  return (
    <div className="chat-container">
      <WalletPill
        address={address}
        credits={balance.credits}
        usdcCents={balance.usdcCents}
        onEarnCredits={() => requestNextAd("video")}
      />
      
      <div style={{ marginBottom: "8px" }}>
        <ModelPicker
          models={models}
          selectedModel={selectedModel}
          onChange={changeModel}
        />
      </div>

      <div className="messages-list">
        <MessageList messages={messages} streamingId={streamingId} />
        
        {activeTextAd && (
          <TextAd
            ad={activeTextAd}
            onClaim={() => claimTextAd(activeTextAd.impressionToken, activeTextAd.durationMs || 5000)}
            onDismiss={dismissTextAd}
          />
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        onClear={handleClear}
        onAttachContext={handleAttachContext}
        attachedContext={attachedContext}
        onRemoveContext={() => setAttachedContext(null)}
        text={inputText}
        setText={setInputText}
      />

      {activeVideoAd && (
        <VideoAdModal
          ad={activeVideoAd}
          backendUrl={backendUrl}
          onSkip={dismissVideoAd}
          onComplete={(heartbeats, watchedMs) => {
            claimVideoAd(activeVideoAd.sessionId, activeVideoAd.nonceHex, heartbeats, watchedMs);
          }}
        />
      )}
    </div>
  );
}
