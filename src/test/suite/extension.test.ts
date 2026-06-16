import * as assert from 'assert';
import * as vscode from 'vscode';
import { getOrCreateAgentWallet, signEip3009 } from '../../payments/wallet.js';

suite('Molfi Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('1. Suite Activation: extension activates and registers commands', async () => {
    const ext = vscode.extensions.getExtension('nickthelegend.molfi-extension');
    assert.ok(ext, 'Extension should be registered');
    
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    assert.strictEqual(ext?.isActive, true, 'Extension should activate successfully');

    // Verify commands are contributed
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('molfi.connectWallet'));
    assert.ok(commands.includes('molfi.setBackendUrl'));
    assert.ok(commands.includes('molfi.explainSelection'));
  });

  test('2. Suite Wallet: getOrCreateAgentWallet stores and retrieves key in SecretStorage', async () => {
    // Mock vscode SecretStorage
    const mockStorage: Record<string, string> = {};
    const mockSecrets: vscode.SecretStorage = {
      get: async (key: string) => mockStorage[key],
      store: async (key: string, value: string) => {
        mockStorage[key] = value;
      },
      delete: async (key: string) => {
        delete mockStorage[key];
      },
      keys: async () => Object.keys(mockStorage),
      onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
    };

    // First call generates new key
    const wallet1 = await getOrCreateAgentWallet(mockSecrets);
    assert.ok(wallet1.address);
    assert.ok(wallet1.privateKey);
    assert.strictEqual(wallet1.privateKey, mockStorage['molfi_agent_private_key']);

    // Second call retrieves the same key
    const wallet2 = await getOrCreateAgentWallet(mockSecrets);
    assert.strictEqual(wallet2.privateKey, wallet1.privateKey);
    assert.strictEqual(wallet2.address, wallet1.address);
  });

  test('3. Suite Chat Live: [live-fuji] EIP-3009 signatures generation', async () => {
    const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
    if (!clientPrivateKey) {
      console.warn('⚠️  TEST_CLIENT_PRIVATE_KEY not configured. Skipping live Fuji signature test.');
      return;
    }

    const recipient = '0x635ee3EE5D1bADA3c2EF9b3A4a6c741a8460AeBE';
    const amount = '1000';
    const asset = '0x5425890298aed601595a70AB815c96711a31Bc65';
    const chainId = 43113;

    const result = await signEip3009(clientPrivateKey, recipient, amount, asset, chainId);
    assert.ok(result.signature);
    assert.ok(result.authorization);
    assert.strictEqual(result.authorization.to, recipient);
    assert.strictEqual(result.authorization.value, amount);
  });
});
