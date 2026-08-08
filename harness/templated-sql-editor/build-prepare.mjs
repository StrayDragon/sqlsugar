#!/usr/bin/env node
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

await esbuild.build({
  entryPoints: [path.join(__dirname, 'prepare.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(__dirname, 'dist/prepare.cjs'),
  sourcemap: true,
  external: [],
  alias: {
    vscode: path.join(__dirname, 'vscode-stub.mjs'),
  },
  logLevel: 'info',
});

console.log('[harness] built prepare.cjs');
