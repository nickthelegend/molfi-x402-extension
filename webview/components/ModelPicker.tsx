import React, { useState } from "react";
import { ModelEntry } from "../../src/api/models";

export function ModelPicker({
  models,
  selectedModel,
  onChange,
}: {
  models: ModelEntry[];
  selectedModel: string;
  onChange: (modelId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const activeModel = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    usdc_cost: 0.001,
    credit_cost: 1,
    description: "Language model",
  };

  const getTier = (model: ModelEntry) => {
    if (model.usdc_cost <= 0.0001) return "Free ($0.0001)";
    if (model.usdc_cost <= 0.005) return "Cheap ($0.001 - $0.005)";
    return "Premium ($0.010+)";
  };

  const tiers = ["Free ($0.0001)", "Cheap ($0.001 - $0.005)", "Premium ($0.010+)"];

  return (
    <div className="model-picker-container">
      <button className="model-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>🤖 {activeModel.name}</span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="model-picker-dropdown">
          {tiers.map((tier) => {
            const tierModels = models.filter((m) => getTier(m) === tier);
            if (tierModels.length === 0) return null;
            return (
              <div key={tier}>
                <div className="model-tier-header">{tier}</div>
                {tierModels.map((m) => (
                  <div
                    key={m.id}
                    className={`model-item ${m.id === selectedModel ? "selected" : ""}`}
                    onClick={() => {
                      onChange(m.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="model-name-row">
                      <span>{m.name}</span>
                      <span className="model-cost-badge">
                        ${m.usdc_cost} · {m.credit_cost}cr
                      </span>
                    </div>
                    <div className="model-desc">{m.description}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
