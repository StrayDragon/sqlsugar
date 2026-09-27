#!/usr/bin/env node
/**
 * Capture expected rendered SQL from the real editor (browser) and write goldens/.
 * Run after examples or prepare defaults change:
 *   pnpm run harness:templated-sql:goldens
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { normalizeRenderedSql } from './shared/normalize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const GOLDENS = path.join(__dirname, 'goldens');
const EXAMPLES_DIR = path.join(GOLDENS, 'examples');
const CASES_DIR = path.join(GOLDENS, 'cases');
const PORT = Number(process.env.HARNESS_PORT || 4177);
const BASE = `http://127.0.0.1:${PORT}`;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stdout.on('data', d => process.stdout.write(d));
    child.stderr.on('data', d => {
      stderr += d.toString();
      process.stderr.write(d);
    });
    child.on('exit', code => {
      if (code === 0) resolve();
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

function writeSql(relPath, content) {
  const abs = path.join(GOLDENS, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, normalizeRenderedSql(content), 'utf8');
  return relPath;
}

async function captureRendered(page, exampleId, overrides) {
  return page.evaluate(
    async ({ id, overrides: ov }) => {
      const harness = window.__SQLSUGAR_HARNESS__;
      if (!harness) throw new Error('harness API missing');
      await harness.loadExample(id);
      if (ov && typeof ov === 'object') {
        await harness.applyOverrides(ov);
      }
      const app = document.querySelector('sqlsugar-templated-sql-app');
      const editor = app?.shadowRoot?.querySelector('templated-sql-editor');
      if (!editor) throw new Error('editor missing');
      return String(editor.renderedResult ?? '');
    },
    { id: exampleId, overrides }
  );
}

async function main() {
  console.log('[goldens] building…');
  await run('node', ['esbuild.js', '--webview-only']);
  await run('node', ['harness/templated-sql-editor/build-prepare.mjs']);

  fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
  fs.mkdirSync(CASES_DIR, { recursive: true });

  const casesMeta = JSON.parse(fs.readFileSync(path.join(GOLDENS, 'cases.json'), 'utf8'));

  // The whole generation run shares one instant: the server's clock is pinned
  // to it via env, and the manifest records it for verify.mjs to pin back.
  const generatedAt = new Date().toISOString();

  console.log('[goldens] starting server…');
  const server = spawn('node', ['harness/templated-sql-editor/server.mjs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HARNESS_PORT: String(PORT), HARNESS_DATE_PIN: generatedAt },
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

  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    // Belt-and-suspenders: freeze the browser clock to the same instant in
    // case any editor-side default derives from the browser's Date.
    await page.clock.setFixedTime(new Date(generatedAt));
    page.on('pageerror', err => console.error('[pageerror]', err.message));

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => Boolean(window.__SQLSUGAR_HARNESS__), null, {
      timeout: 60_000,
    });

    const examples = await page.evaluate(() => window.__SQLSUGAR_HARNESS__.listExamples());
    const suites = Array.isArray(casesMeta.suites)
      ? casesMeta.suites
      : casesMeta.exampleId
        ? [{ exampleId: casesMeta.exampleId, description: casesMeta.description, cases: casesMeta.cases || [] }]
        : [];

    const manifest = {
      generatedAt: generatedAt.toISOString(),
      examples: [],
      multiFieldSuites: [],
    };

    for (const ex of examples) {
      console.log(`[goldens] example ${ex.id}`);
      const rendered = await captureRendered(page, ex.id, null);
      if (rendered.includes('-- [渲染错误]')) {
        throw new Error(`cannot golden ${ex.id}: render error\n${rendered.slice(0, 400)}`);
      }
      const rel = `examples/${ex.id.replace(/\.sql$/, '')}.expected.sql`;
      writeSql(rel, rendered);
      manifest.examples.push({ id: ex.id, expected: rel });
    }

    let multiCaseCount = 0;
    for (const suite of suites) {
      const suiteOut = {
        exampleId: suite.exampleId,
        description: suite.description || '',
        cases: [],
      };
      for (const c of suite.cases || []) {
        console.log(`[goldens] case ${suite.exampleId}::${c.id}`);
        const rendered = await captureRendered(page, suite.exampleId, c.overrides);
        if (rendered.includes('-- [渲染错误]')) {
          throw new Error(
            `cannot golden case ${suite.exampleId}::${c.id}: render error\n${rendered.slice(0, 400)}`
          );
        }
        writeSql(c.expected, rendered);
        suiteOut.cases.push({
          id: c.id,
          label: c.label,
          overrides: c.overrides,
          expected: c.expected,
        });
        multiCaseCount += 1;
      }
      manifest.multiFieldSuites.push(suiteOut);
    }

    fs.writeFileSync(path.join(GOLDENS, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await browser.close();
    console.log(
      `[goldens] wrote ${manifest.examples.length} example goldens + ${multiCaseCount} multi-field cases across ${manifest.multiFieldSuites.length} suites`
    );
  } finally {
    shutdown();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
