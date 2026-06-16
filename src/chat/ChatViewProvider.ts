import * as vscode from "vscode";
import { randomBytes } from "crypto";
import { MessageBus } from "./messageBus";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "molfi.chatView";
  private view?: vscode.WebviewView;

  constructor(private ctx: vscode.ExtensionContext, private bus: MessageBus) {}

  async resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((msg) => this.bus.handleFromWebview(msg, this));
    this.bus.bind(this);

    // Fetch details for init message
    try {
      const address = await this.bus.wallet.getAddress();
      const { getBalance } = require("../api/credits");
      const { fetchModels } = require("../api/models");
      const { getConfig } = require("../util/config");

      const balance = await getBalance(this.bus.api);
      const models = await fetchModels(this.bus.api);
      const config = getConfig();

      view.webview.postMessage({
        type: "init",
        address,
        balance,
        models,
        defaultModel: config.defaultModel,
        backendUrl: config.backendUrl,
      });
    } catch (err) {
      console.error("Failed to initialize webview state:", err);
    }
  }

  postToWebview(msg: unknown) { this.view?.webview.postMessage(msg); }

  private html(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString("hex");
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "webview.js")
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "webview", "styles.css")
    );
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} https: data:`,
      `media-src ${webview.cspSource} https:`,
      `connect-src ${webview.cspSource} https: http://localhost:*`,
      `font-src ${webview.cspSource}`,
    ].join("; ");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${stylesUri}" rel="stylesheet" />
  <title>Molfi</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
