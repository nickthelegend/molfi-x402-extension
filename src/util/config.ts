import * as vscode from 'vscode';

export function getConfig() {
  const cfg = vscode.workspace.getConfiguration('molfi');
  return {
    backendUrl: cfg.get<string>('backendUrl', 'http://localhost:3001'),
    defaultModel: cfg.get<string>('defaultModel', 'llama-3.3-70b'),
    ads: {
      enabled: cfg.get<boolean>('ads.enabled', true),
      videoFrequency: cfg.get<number>('ads.videoFrequency', 5),
    },
    attachActiveFile: cfg.get<boolean>('attachActiveFile', false),
  };
}
