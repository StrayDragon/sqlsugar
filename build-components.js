import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Building Jinja2 Editor Web Components...");

// Clean the dist directory
const fs = await import("fs");
if (fs.existsSync(join(__dirname, "dist/jinja2-editor"))) {
  fs.rmSync(join(__dirname, "dist/jinja2-editor"), { recursive: true });
}

try {
  await esbuild.build({
    entryPoints: ["./src/jinja2-editor/index.ts"],
    bundle: true,
    outfile: "./dist/jinja2-editor/jinja2-editor.js",
    format: "esm",
    target: "es2022",
    platform: "browser",
    external: ["vscode", "lit"],
    plugins: [
      copy({
        assets: [
          {
            from: "./src/jinja2-editor/styles/**/*.css",
            to: "./dist/jinja2-editor/styles",
          },
        ],
      }),
    ],
    loader: {
      ".ts": "ts",
      ".css": "text",
    },
    tsconfig: "./tsconfig.json",
    sourcemap: true,
    minify: process.env.NODE_ENV === "production",
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
  });

  console.log("✅ Web components built successfully");
  console.log("📁 Output: dist/jinja2-editor/jinja2-editor.js");
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}