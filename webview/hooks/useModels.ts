import { useState, useEffect } from "react";
import { onHostMessage, postToHost } from "../lib/messageBus";
import { ModelEntry } from "../../src/api/models";

export function useModels() {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("llama-3.3-70b");

  useEffect(() => {
    return onHostMessage((msg) => {
      if (msg.type === "init") {
        setModels(msg.models);
        if (msg.defaultModel) {
          setSelectedModel(msg.defaultModel);
        }
      } else if (msg.type === "model.set") {
        setSelectedModel(msg.modelId);
      }
    });
  }, []);

  const changeModel = (modelId: string) => {
    setSelectedModel(modelId);
    postToHost({ type: "model.change", modelId });
  };

  return { models, selectedModel, changeModel };
}
