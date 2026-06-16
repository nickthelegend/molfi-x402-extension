import * as vscode from "vscode";

export function captureSelection(): {
  filePath?: string; selection?: string; language?: string; lineStart?: number; lineEnd?: number;
} | null {
  const ed = vscode.window.activeTextEditor;
  if (!ed) return null;
  const sel = ed.selection;
  const text = ed.document.getText(sel);
  return {
    filePath: vscode.workspace.asRelativePath(ed.document.uri),
    selection: text || undefined,
    language: ed.document.languageId,
    lineStart: sel.start.line + 1,
    lineEnd: sel.end.line + 1,
  };
}

export function captureActiveFile(): { filePath?: string; content?: string; language?: string } | null {
  const ed = vscode.window.activeTextEditor;
  if (!ed) return null;
  return {
    filePath: vscode.workspace.asRelativePath(ed.document.uri),
    content: ed.document.getText(),
    language: ed.document.languageId,
  };
}

export async function insertAtCursor(code: string) {
  const ed = vscode.window.activeTextEditor;
  if (!ed) {
    vscode.window.showWarningMessage("No active editor to insert into.");
    return;
  }
  await ed.edit(b => b.replace(ed.selection, code));
}
