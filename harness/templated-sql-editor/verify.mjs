#!/usr/bin/env node
/**
 * Headless self-verify: open harness page with ?autorun=1 and assert all examples pass.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = Number(process.env.HARNESS_PORT || 4177);
const BASE = `http://127.0.0.1:${PORT}`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on('data', d => {
      stderr += d.toString();
      process.stderr.write(d);
    });
    child.on('exit', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}\n${stderr}`));
    });
  });
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/examples`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error(`Harness server did not become ready at ${BASE}`);
}

async function main() {
  console.log('[verify] building webview + prepare bundle…');
  await run('node', ['esbuild.js', '--webview-only']);
  await run('node', ['harness/templated-sql-editor/build-prepare.mjs']);

  console.log('[verify] starting server…');
  const server = spawn('node', ['harness/templated-sql-editor/server.mjs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HARNESS_PORT: String(PORT) },
  });
  server.stdout.on('data', d => process.stdout.write(d));
  server.stderr.on('data', d => process.stderr.write(d));

  const shutdown = () => {
    try {
      server.kill('SIGTERM');
    } catch {
      // ignore
    }
  };
  process.on('exit', shutdown);
  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });

  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('[browser console.error]', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.error('[browser pageerror]', err.message);
    });

    console.log('[verify] opening autorun page…');
    await page.goto(`${BASE}/?autorun=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Wait until harness finishes autorun.
    const report = await page.waitForFunction(
      () => window.__HARNESS_LAST_REPORT__ || null,
      null,
      { timeout: 120_000 }
    ).then(handle => handle.jsonValue());

    await browser.close();

    console.log('[verify] report:', JSON.stringify(report, null, 2));
    if (!report?.ok) {
      process.exitCode = 1;
      console.error('[verify] FAILED');
    } else {
      console.log('[verify] ALL PASSED');
    }
  } finally {
    shutdown();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
