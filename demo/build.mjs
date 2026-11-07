// Arma la demo publicable: un solo HTML con la app en datos de ejemplo.
// React se carga desde cdnjs (versión fija); el resto (código y estilos) va dentro del HTML.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shim = (f) => path.join(root, "demo/shims", f);
const MAP = {
  react: shim("react.js"),
  "react/jsx-runtime": shim("jsx-runtime.js"),
  "react-dom/client": shim("react-dom-client.js"),
  "next/link": shim("next-link.tsx"),
  "next/navigation": shim("next-navigation.ts"),
  "next/cache": shim("empty.js"),
  "server-only": shim("empty.js"),
  "@/lib/data.ts": path.join(root, "demo/data.ts"),
};

const res = await build({
  entryPoints: [path.join(root, "demo/main.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  minify: true,
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: path.join(root, "tsconfig.json"),
  plugins: [{
    name: "alias",
    setup(b) {
      b.onResolve({ filter: /^(react|react\/jsx-runtime|react-dom\/client|next\/link|next\/navigation|next\/cache|server-only|@\/lib\/data\.ts)$/ }, (a) => ({ path: MAP[a.path] }));
    },
  }],
  logLevel: "warning",
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

mkdirSync(path.join(root, "demo/out"), { recursive: true });
const cssOut = path.join(root, "demo/out/app.css");
execFileSync(path.join(root, "node_modules/.bin/tailwindcss"), [
  "-c", path.join(root, "tailwind.config.ts"),
  "-i", path.join(root, "app/globals.css"),
  "--content", `${root}/app/**/*.{ts,tsx},${root}/components/**/*.{ts,tsx},${root}/demo/**/*.{ts,tsx}`,
  "-o", cssOut, "--minify",
], { stdio: "inherit" });
const css = readFileSync(cssOut, "utf8");

const html = `<title>Catalejo demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
${css}
:root{--font-inter:"Inter";--font-jb:"JetBrains Mono"}
body{background:var(--c-bg);color:var(--c-text)}
</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync(path.join(root, "demo/out/catalejo-demo.html"), html);
console.log("demo:", (html.length / 1024).toFixed(0), "KB");
