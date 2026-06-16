let vscode: any = null;

export function useVscode() {
  if (!vscode) {
    try {
      // @ts-ignore
      vscode = acquireVsCodeApi();
    } catch (e) {
      console.warn("VS Code API not available, using mock.");
      vscode = {
        postMessage: (msg: any) => console.log("Post to Host (Mock):", msg),
      };
    }
  }
  return vscode;
}
