import esbuild from "esbuild";
import process from "node:process";

const prod = process.argv.includes("--prod");
const watch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  minify: prod,
  legalComments: prod ? "none" : "inline",
  treeShaking: true,
  outfile: "main.js",
  platform: "browser",
  metafile: true,
});

if (watch) {
  await context.watch();
  console.log("Watching for changes...");
} else {
  await context.rebuild();
  await context.dispose();
}
