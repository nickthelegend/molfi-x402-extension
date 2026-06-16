import * as vscode from "vscode";

export class StatusBar {
  private item: vscode.StatusBarItem;
  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = "molfi.switchModel";
    this.item.show();
  }
  update(model: string, credits: number) {
    this.item.text = `$(sparkle) Molfi · ${model} · ${credits}cr`;
    this.item.tooltip = `Active model: ${model}\nCredits: ${credits}\nClick to switch model`;
  }
  dispose() { this.item.dispose(); }
}
