import * as vscode from 'vscode';
import { MolfiChatViewProvider } from './chatViewProvider.js';
import { getOrCreateAgentWallet } from './payments/wallet.js';

export function activate(context: vscode.ExtensionContext) {
  console.log('Molfi Dev Companion is active!');

  const provider = new MolfiChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MolfiChatViewProvider.viewType, provider)
  );

  // 1. Connect Wallet Command
  context.subscriptions.push(
    vscode.commands.registerCommand('molfi.connectWallet', async () => {
      const wallet = await getOrCreateAgentWallet(context.secrets);
      vscode.window.showInformationMessage(
        `Molfi Wallet Address: ${wallet.address} (Fuji Testnet)`,
        'Copy Address',
        'Open Circle Faucet'
      ).then((selection) => {
        if (selection === 'Copy Address') {
          vscode.env.clipboard.writeText(wallet.address);
        } else if (selection === 'Open Circle Faucet') {
          vscode.env.openExternal(vscode.Uri.parse('https://faucet.circle.com'));
        }
      });
    })
  );

  // 2. Set Backend URL Command
  context.subscriptions.push(
    vscode.commands.registerCommand('molfi.setBackendUrl', async () => {
      const config = vscode.workspace.getConfiguration('molfi');
      const current = config.get<string>('backendUrl', 'http://localhost:8787');
      const input = await vscode.window.showInputBox({
        prompt: 'Enter Molfi Backend API base URL',
        value: current,
        ignoreFocusOut: true,
      });
      if (input !== undefined) {
        await config.update('backendUrl', input, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Molfi Backend URL set to: ${input}`);
      }
    })
  );

  // 3. Explain Selection Command
  context.subscriptions.push(
    vscode.commands.registerCommand('molfi.explainSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active text editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text.trim()) {
        vscode.window.showWarningMessage('No text highlighted.');
        return;
      }

      // Automatically focus Molfi sidebar chat view and trigger request
      await vscode.commands.executeCommand('workbench.view.extension.molfi-sidebar');
      
      // We trigger explain selection in provider
      vscode.commands.executeCommand('molfi.chatView.focus');
      
      // Let's send select content as prompt
      const prompt = `Explain the following code block:\n\n\`\`\`\n${text}\n\`\`\``;
      
      // Post selection payload to provider handler
      // Wait, resolve resolved view
      const viewProvider = provider as any;
      if (viewProvider._view) {
        viewProvider._view.show(true);
        await viewProvider._handleSendMessage(prompt);
      } else {
        vscode.window.showErrorMessage('Please open the Molfi Chat view container first.');
      }
    })
  );
}

export function deactivate() {}
