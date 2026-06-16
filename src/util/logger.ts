import * as vscode from "vscode";

export class Logger {
  private channel: vscode.OutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel("Molfi");
  }

  info(msg: string) {
    this.channel.appendLine(`[INFO] ${msg}`);
  }

  warn(msg: string) {
    this.channel.appendLine(`[WARN] ${msg}`);
  }

  error(msg: string) {
    this.channel.appendLine(`[ERROR] ${msg}`);
  }

  dispose() {
    this.channel.dispose();
  }
}
export const logger = new Logger();
