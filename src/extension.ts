import * as vscode from 'vscode';
import { WalletStore } from './auth/walletStore.js';
import { SiweClient } from './auth/siweClient.js';
import { ApiClient } from './api/client.js';
import { ChatViewProvider } from './chat/ChatViewProvider.js';
import { MessageBus } from './chat/messageBus.js';
import { registerAll } from './commands/registerAll.js';
import { StatusBar } from './status/statusBar.js';
import { logger } from './util/logger.js';

export function activate(context: vscode.ExtensionContext) {
  logger.info('Molfi companion extension activating...');

  const wallet = new WalletStore(context);
  const siwe = new SiweClient(context, wallet);
  const api = new ApiClient(siwe);
  const statusBar = new StatusBar();

  const bus = new MessageBus(api, wallet, statusBar);
  const provider = new ChatViewProvider(context, bus);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
  );

  registerAll(context, {
    provider,
    bus,
    wallet,
    siwe,
    api,
    statusBar,
  });

  bus.wallet.getAddress().then(async (addr) => {
    logger.info(`Molfi wallet initialized: ${addr}`);
    
    try {
      await siwe.getJwt();
      logger.info('SIWE auto-login successful.');
    } catch (e: any) {
      logger.warn(`SIWE auto-login failed: ${e.message}`);
    }

    try {
      await bus.refreshBalance(provider);
    } catch (e) {
      // ignore
    }
  });

  context.subscriptions.push(statusBar);
  logger.info('Molfi companion extension is now active!');
}

export function deactivate() {
  logger.info('Molfi companion extension deactivated.');
}
