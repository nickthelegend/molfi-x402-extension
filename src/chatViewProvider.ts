import * as vscode from 'vscode';
import { getOrCreateAgentWallet, signEip3009 } from './payments/wallet.js';

export class MolfiChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'molfi.chatView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionContext.extensionUri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this._handleSendMessage(data.text);
          break;
        case 'getWallet':
          await this._sendWalletInfo();
          break;
      }
    });
  }

  private async _sendWalletInfo() {
    if (!this._view) return;
    const wallet = await getOrCreateAgentWallet(this._extensionContext.secrets);
    this._view.webview.postMessage({
      type: 'walletInfo',
      address: wallet.address,
    });
  }

  private async _handleSendMessage(prompt: string) {
    if (!this._view) return;

    this._view.webview.postMessage({ type: 'addMessage', role: 'user', text: prompt });

    const backendUrl = vscode.workspace.getConfiguration('molfi').get('backendUrl', 'http://localhost:8787');
    const model = 'llama-3.3-70b';

    try {
      let res = await fetch(`${backendUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 402) {
        this._view.webview.postMessage({ type: 'status', text: 'Processing x402 payment...' });

        const errorJson = (await res.json()) as any;
        const accepts = errorJson.accepts?.[0];
        if (!accepts) {
          throw new Error('Payment required but accepts payload missing.');
        }

        const { maxAmountRequired, payTo, asset } = accepts;
        const wallet = await getOrCreateAgentWallet(this._extensionContext.secrets);

        const paymentData = await signEip3009(
          wallet.privateKey,
          payTo,
          maxAmountRequired,
          asset,
          43113
        );

        const xPaymentPayload = {
          x402Version: 1,
          scheme: 'exact',
          network: 'avalanche-fuji',
          payload: paymentData,
        };

        const xPaymentBase64 = Buffer.from(JSON.stringify(xPaymentPayload)).toString('base64');

        res = await fetch(`${backendUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PAYMENT': xPaymentBase64,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
      }

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as any;
        throw new Error(errJson.error || `Request failed: ${res.status}`);
      }

      const txHeader = res.headers.get('x-payment-response');
      let txHash = '';
      if (txHeader) {
        try {
          const decoded = JSON.parse(Buffer.from(txHeader, 'base64').toString('utf-8'));
          txHash = decoded.transaction;
        } catch (e) {
          // ignore
        }
      }

      if (!res.body) throw new Error('Response stream is empty.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      this._view.webview.postMessage({ type: 'startAssistant', txHash });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const raw = line.trim().slice(6);
            if (raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                assistantMsg += content;
                this._view.webview.postMessage({ type: 'chunk', text: content });
              }
            } catch (err) {
              // ignore
            }
          }
        }
      }
    } catch (error) {
      this._view.webview.postMessage({
        type: 'addMessage',
        role: 'assistant',
        text: `⚠️ Error: ${(error as Error).message}`,
      });
    }
  }

  private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionContext.extensionUri, 'src', 'webview', 'styles.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stylesUri}" rel="stylesheet">
</head>
<body>
  <div id="wallet-info">Fuji Wallet: Loading...</div>
  <div id="messages"></div>
  <div id="input-container">
    <input type="text" id="prompt-input" placeholder="Ask Molfi Dev Companion..." />
    <button id="send-btn">Send</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const walletInfo = document.getElementById('wallet-info');
    let currentAssistantDiv = null;

    vscode.postMessage({ type: 'getWallet' });

    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        vscode.postMessage({ type: 'sendMessage', text });
        input.value = '';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'walletInfo':
          walletInfo.innerText = "Fuji Wallet: " + msg.address.slice(0,6) + "..." + msg.address.slice(-4);
          break;
        case 'status':
          const statusDiv = document.createElement('div');
          statusDiv.className = 'status';
          statusDiv.id = 'status-msg';
          statusDiv.innerText = msg.text;
          messagesDiv.appendChild(statusDiv);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          break;
        case 'addMessage':
          const statusMsg = document.getElementById('status-msg');
          if (statusMsg) statusMsg.remove();

          const div = document.createElement('div');
          div.className = 'message ' + msg.role;
          div.innerText = msg.text;
          messagesDiv.appendChild(div);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          break;
        case 'startAssistant':
          const statusMsg2 = document.getElementById('status-msg');
          if (statusMsg2) statusMsg2.remove();

          currentAssistantDiv = document.createElement('div');
          currentAssistantDiv.className = 'message assistant';
          messagesDiv.appendChild(currentAssistantDiv);

          if (msg.txHash) {
            const badge = document.createElement('a');
            badge.className = 'badge';
            badge.href = 'https://testnet.snowtrace.io/tx/' + msg.txHash;
            badge.target = '_blank';
            badge.innerText = '💸 USDC · ' + msg.txHash.slice(0,6) + '... ↗';
            currentAssistantDiv.appendChild(badge);
            const br = document.createElement('br');
            currentAssistantDiv.appendChild(br);
          }
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          break;
        case 'chunk':
          if (currentAssistantDiv) {
            const textNode = document.createTextNode(msg.text);
            currentAssistantDiv.appendChild(textNode);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}
