const esbuild = require("esbuild");
const isWatch = process.argv.includes("--watch");
const isProd = process.argv.includes("--production");

const common = {
  bundle: true,
  sourcemap: !isProd,
  minify: isProd,
  logLevel: "info",
};

const host = {
  ...common,
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  external: ["vscode"],
  platform: "node",
  format: "cjs",
  target: "node20",
};

const webview = {
  ...common,
  entryPoints: ["webview/main.tsx"],
  outfile: "dist/webview.js",
  platform: "browser",
  format: "iife",
  target: "chrome120",
  loader: { ".css": "text" },
};

(async () => {
  if (isWatch) {
    const a = await esbuild.context(host);
    const b = await esbuild.context(webview);
    await Promise.all([a.watch(), b.watch()]);
    console.log("watching...");
  } else {
    await Promise.all([esbuild.build(host), esbuild.build(webview)]);
  }
})();
