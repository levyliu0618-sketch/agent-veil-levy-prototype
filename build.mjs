// Static build: bundles src/ into docs/ (served by GitHub Pages from /docs).
// Relative asset paths + hash routing, so it works under any sub-path and
// page refreshes never 404.
import * as esbuild from "esbuild";
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";

const out = "docs";
mkdirSync(`${out}/assets`, { recursive: true });
await esbuild.build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: `${out}/assets/app.js`,
  define: { "process.env.NODE_ENV": '"production"' },
  jsx: "automatic",
  loader: { ".ts": "ts", ".tsx": "tsx" },
  nodePaths: process.env.EXTRA_NODE_PATH ? [process.env.EXTRA_NODE_PATH] : [],
  logLevel: "info",
});
copyFileSync("index.html", `${out}/index.html`);
copyFileSync("index.html", `${out}/404.html`);
writeFileSync(`${out}/.nojekyll`, "");
