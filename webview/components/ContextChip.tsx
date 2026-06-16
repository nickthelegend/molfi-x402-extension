import React from "react";

export function ContextChip({ label, onClose }: { label: string; onClose?: () => void }) {
  return (
    <div className="context-chip">
      <span>📎 {label}</span>
      {onClose && (
        <span className="context-chip-close" onClick={onClose}>
          ×
        </span>
      )}
    </div>
  );
}
