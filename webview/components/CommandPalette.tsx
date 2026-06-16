import React from "react";

export interface CommandItem {
  name: string;
  desc: string;
}

const COMMANDS: CommandItem[] = [
  { name: "/clear", desc: "Clear chat history" },
  { name: "/model", desc: "Switch selected AI model" },
  { name: "/file", desc: "Attach file context" },
  { name: "/selection", desc: "Attach selection context" },
  { name: "/wallet", desc: "Show wallet information" },
  { name: "/topup", desc: "Top up credits using USDC" },
];

export function CommandPalette({
  filter,
  onSelect,
  activeIndex,
}: {
  filter: string;
  onSelect: (commandName: string) => void;
  activeIndex: number;
}) {
  const filtered = COMMANDS.filter((c) =>
    c.name.toLowerCase().startsWith(filter.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="command-palette">
      {filtered.map((cmd, idx) => (
        <div
          key={cmd.name}
          className={`command-item ${idx === activeIndex ? "active" : ""}`}
          onClick={() => onSelect(cmd.name)}
        >
          <span className="command-item-name">{cmd.name}</span>
          <span className="command-item-desc">{cmd.desc}</span>
        </div>
      ))}
    </div>
  );
}
export { COMMANDS };
