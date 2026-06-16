import * as vscode from "vscode";
import { topUpFlow } from "./topUpCredits";
import { fetchModels } from "../api/models";
import { getBalance } from "../api/credits";
import { captureSelection } from "../context/editorContext";

export function registerAll(ctx: vscode.ExtensionContext, deps: any) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("molfi.newChat", () => deps.provider.postToWebview({ type: "chat.reset" })),
    vscode.commands.registerCommand("molfi.explainSelection", () => runWithSelection(deps, "Explain this code in detail. What does it do and what could go wrong?")),
    vscode.commands.registerCommand("molfi.refactorSelection", () => runWithSelection(deps, "Refactor this code for readability and performance. Show the refactored version with a brief explanation of what changed.")),
    vscode.commands.registerCommand("molfi.generateTests", () => runWithSelection(deps, "Generate thorough unit tests for this code. Cover happy paths and edge cases.")),
    vscode.commands.registerCommand("molfi.switchModel", () => quickPickModel(deps)),
    vscode.commands.registerCommand("molfi.topUpCredits", () => topUpFlow(deps.api, deps.wallet)),
    vscode.commands.registerCommand("molfi.showWallet", () => showWalletPanel(deps)),
    vscode.commands.registerCommand("molfi.openSettings", () => vscode.commands.executeCommand("workbench.action.openSettings", "molfi")),
    vscode.commands.registerCommand("molfi.signOut", () => signOut(deps)),
  );
}

async function runWithSelection(deps: any, promptText: string) {
  const sel = captureSelection();
  if (!sel) {
    vscode.window.showWarningMessage("No active selection found.");
    return;
  }
  
  await vscode.commands.executeCommand("workbench.view.extension.molfi-sidebar");
  await vscode.commands.executeCommand("molfi.chatView.focus");
  
  deps.provider.postToWebview({
    type: "context.attached",
    filePath: sel.filePath || "active selection",
    selection: sel.selection,
    language: sel.language,
    promptHint: promptText,
  });
}

async function quickPickModel(deps: any) {
  const models = await fetchModels(deps.api);
  const items = models.map((m) => ({
    label: m.name,
    description: `${m.usdc_cost} USDC · ${m.credit_cost} credits`,
    detail: m.description,
    id: m.id,
  }));
  
  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: "Select active LLM model",
  });
  
  if (pick) {
    deps.provider.postToWebview({ type: "model.set", modelId: pick.id });
    await vscode.workspace.getConfiguration("molfi").update("defaultModel", pick.id, vscode.ConfigurationTarget.Global);
    const bal = await getBalance(deps.api);
    deps.statusBar.update(pick.id, bal.credits);
  }
}

async function showWalletPanel(deps: any) {
  const addr = await deps.wallet.getAddress();
  vscode.window.showInformationMessage(
    `Molfi Wallet Address: ${addr} (Avalanche Fuji)`,
    "Copy Address",
    "Open Faucet"
  ).then((sel) => {
    if (sel === "Copy Address") {
      vscode.env.clipboard.writeText(addr);
    } else if (sel === "Open Faucet") {
      vscode.env.openExternal(vscode.Uri.parse("https://faucet.circle.com"));
    }
  });
}

async function signOut(deps: any) {
  await deps.siwe.signOut();
  vscode.window.showInformationMessage("Signed out of Molfi companion session successfully.");
}
