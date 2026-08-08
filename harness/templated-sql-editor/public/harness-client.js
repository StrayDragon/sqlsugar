/**
 * Browser-side harness client.
 * Loads examples via /api/prepare/*, posts the same `init` message the VS Code
 * webview uses, then 对拍 against preprocessed goldens (no-error + exact render).
 */

import { normalizeRenderedSql, diffNormalized } from '/shared/normalize.mjs';

const CRITICAL_LOG_CATEGORIES = [
  'NUNJUCKS_ERROR',
  'TEMPLATE_RENDER_ERROR',
  'TSE_EDITOR_ERROR',
  'PLACEHOLDER_DETECTED',
  'PLACEHOLDER_IN_HTML',
];

const state = {
  examples: [],
  goldens: null,
  results: new Map(),
  activeId: null,
};

const logEl = () => document.getElementById('log');
const summaryEl = () => document.getElementById('harness-summary');
const listEl = () => document.getElementById('example-list');

function log(line) {
  const el = logEl();
  el.textContent += `${line}\n`;
  el.scrollTop = el.scrollHeight;
}

function clearLog() {
  logEl().textContent = '';
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForApp(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const app = document.querySelector('sqlsugar-templated-sql-app');
    if (app?.shadowRoot?.querySelector('templated-sql-editor')) {
      return app;
    }
    await wait(50);
  }
  throw new Error('templated-sql-editor did not mount');
}

function getEditor(app) {
  return app.shadowRoot.querySelector('templated-sql-editor');
}

function collectPageErrors() {
  return window.__HARNESS_PAGE_ERRORS__ || [];
}

function collectCriticalLogs() {
  return (window.__HARNESS_LOGS__ || []).filter(msg => {
    const category = String(msg?.category || msg?.command || '');
    return CRITICAL_LOG_CATEGORIES.some(c => category.includes(c));
  });
}

function inspectEditor(editor) {
  const rendered = String(editor.renderedResult ?? '');
  const issues = [];

  if (rendered.includes('-- [渲染错误]')) {
    issues.push(`preview contains render error marker: ${rendered.slice(0, 200)}`);
  }

  if (editor.template && editor.template.trim().length > 0 && rendered.trim().length === 0) {
    issues.push('preview is empty for non-empty template');
  }

  const criticalLogs = collectCriticalLogs();
  for (const msg of criticalLogs) {
    issues.push(`webview log ${msg.category || msg.command}: ${msg.message || JSON.stringify(msg)}`);
  }

  const pageErrors = collectPageErrors();
  for (const err of pageErrors) {
    issues.push(`pageerror: ${err}`);
  }

  return { rendered, issues };
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status}`);
  }
  return res.text();
}

async function loadGoldensManifest() {
  const res = await fetch('/api/goldens/manifest');
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`goldens manifest failed: ${res.status}`);
  }
  return res.json();
}

function findExampleGolden(exampleId) {
  return state.goldens?.examples?.find(e => e.id === exampleId) || null;
}

async function compareToGolden(rendered, expectedRelPath, label) {
  const expected = await fetchText(`/goldens/${expectedRelPath}`);
  const diff = diffNormalized(rendered, expected);
  if (diff) {
    return [`对拍失败 [${label}] vs ${expectedRelPath}:\n${diff}`];
  }
  return [];
}

async function loadExample(id) {
  window.__HARNESS_LOGS__ = [];
  window.__HARNESS_PAGE_ERRORS__ = [];

  const res = await fetch(`/api/prepare/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `prepare failed: ${res.status}`);
  }
  const prepared = await res.json();

  const app = await waitForApp();
  const editor = getEditor(app);
  // Clear prior case overrides so init defaults are not polluted.
  editor.variableValues = {};
  editor.values = {};

  window.postMessage(
    {
      command: 'init',
      template: prepared.template,
      variables: prepared.variables,
      config: {
        logLevel: 'error',
        autoPreview: true,
        animationsEnabled: false,
      },
    },
    '*'
  );

  await wait(150);
  if (typeof editor.renderTemplate === 'function') {
    await editor.renderTemplate();
  } else {
    await wait(200);
  }
  await wait(100);

  state.activeId = id;
  document.querySelectorAll('#example-list button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });

  return { prepared, editor };
}

/**
 * Merge override field values into the live editor and re-render.
 * Supports nested objects (e.g. filters) and scalar/array fields.
 */
async function applyOverrides(overrides) {
  const app = await waitForApp();
  const editor = getEditor(app);
  if (!overrides || typeof overrides !== 'object') {
    return editor;
  }

  const next = { ...editor.variableValues };
  for (const [key, value] of Object.entries(overrides)) {
    next[key] = value;
    // Drop flattened dotted keys that would fight a parent override
    // (e.g. filters.status vs filters: false).
    for (const existing of Object.keys(next)) {
      if (existing !== key && existing.startsWith(`${key}.`)) {
        delete next[existing];
      }
    }
  }
  editor.variableValues = next;
  editor.values = next;
  if (typeof editor.renderTemplate === 'function') {
    await editor.renderTemplate();
  }
  await wait(80);
  return editor;
}

async function verifyExample(id) {
  const { prepared, editor } = await loadExample(id);
  const { rendered, issues } = inspectEditor(editor);

  if (prepared.warnings?.length) {
    for (const w of prepared.warnings) {
      log(`  warn[${id}]: ${w}`);
    }
  }

  const golden = findExampleGolden(id);
  if (!state.goldens) {
    issues.push('goldens/manifest.json missing — run pnpm run harness:templated-sql:goldens');
  } else if (!golden) {
    issues.push(`missing golden for ${id} (regenerate goldens)`);
  } else {
    issues.push(...(await compareToGolden(rendered, golden.expected, id)));
  }

  const ok = issues.length === 0;
  const record = {
    ok,
    issues,
    renderedLength: rendered.length,
    normalizedLength: normalizeRenderedSql(rendered).length,
  };
  state.results.set(id, record);
  const btn = document.querySelector(`#example-list button[data-id="${CSS.escape(id)}"]`);
  if (btn) {
    btn.classList.toggle('pass', ok);
    btn.classList.toggle('fail', !ok);
  }
  return { id, ...record, rendered };
}

async function verifyMultiFieldCases() {
  const suites = (() => {
    if (Array.isArray(state.goldens?.multiFieldSuites)) {
      return state.goldens.multiFieldSuites;
    }
    // Back-compat with older single-suite manifests.
    if (state.goldens?.multiField?.exampleId) {
      return [state.goldens.multiField];
    }
    return [];
  })();

  if (suites.length === 0) {
    return { ok: true, passed: 0, failed: 0, results: {}, suites: [] };
  }

  const results = {};
  const suiteSummaries = [];
  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    let suitePassed = 0;
    let suiteFailed = 0;
    log(`\n→ multi-field suite ${suite.exampleId}${suite.description ? ` — ${suite.description}` : ''}`);
    for (const c of suite.cases || []) {
      const caseKey = `${suite.exampleId}::${c.id}`;
      log(`  · ${c.id} — ${c.label}`);
      try {
        await loadExample(suite.exampleId);
        if (c.overrides) {
          await applyOverrides(c.overrides);
        }
        const app = await waitForApp();
        const editor = getEditor(app);
        const { rendered, issues } = inspectEditor(editor);
        issues.push(...(await compareToGolden(rendered, c.expected, caseKey)));
        const ok = issues.length === 0;
        results[caseKey] = {
          ok,
          issues,
          renderedLength: rendered.length,
          label: c.label,
          suite: suite.exampleId,
        };
        if (ok) {
          passed += 1;
          suitePassed += 1;
          log(`    PASS`);
        } else {
          failed += 1;
          suiteFailed += 1;
          log(`    FAIL`);
          for (const issue of issues) {
            log(`      - ${issue}`);
          }
        }
      } catch (error) {
        failed += 1;
        suiteFailed += 1;
        const message = error instanceof Error ? error.message : String(error);
        results[caseKey] = {
          ok: false,
          issues: [message],
          renderedLength: 0,
          label: c.label,
          suite: suite.exampleId,
        };
        log(`    FAIL`);
        log(`      - ${message}`);
      }
    }
    suiteSummaries.push({
      exampleId: suite.exampleId,
      passed: suitePassed,
      failed: suiteFailed,
    });
  }

  return { ok: failed === 0, passed, failed, results, suites: suiteSummaries };
}

async function runAll() {
  clearLog();
  state.results.clear();
  const btn = document.getElementById('btn-run-all');
  btn.disabled = true;
  summaryEl().textContent = 'Running…';
  summaryEl().className = '';

  window.__HARNESS_PAGE_ERRORS__ = [];

  let passed = 0;
  let failed = 0;

  for (const ex of state.examples) {
    log(`→ ${ex.id}`);
    try {
      const result = await verifyExample(ex.id);
      if (result.ok) {
        passed += 1;
        log(`  PASS (对拍 ok, ${result.renderedLength} chars)`);
      } else {
        failed += 1;
        log(`  FAIL`);
        for (const issue of result.issues) {
          log(`    - ${issue}`);
        }
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      state.results.set(ex.id, { ok: false, issues: [message], renderedLength: 0 });
      log(`  FAIL`);
      log(`    - ${message}`);
      const listBtn = document.querySelector(`#example-list button[data-id="${CSS.escape(ex.id)}"]`);
      if (listBtn) {
        listBtn.classList.add('fail');
        listBtn.classList.remove('pass');
      }
    }
  }

  const multi = await verifyMultiFieldCases();
  passed += multi.passed;
  failed += multi.failed;
  for (const [k, v] of Object.entries(multi.results)) {
    state.results.set(k, v);
  }

  const total = state.examples.length + (multi.passed + multi.failed);
  const summary = `${passed} passed, ${failed} failed / ${total}`;
  summaryEl().textContent = summary;
  summaryEl().className = failed === 0 ? 'ok' : 'fail';
  log(`\n${summary}`);
  btn.disabled = false;

  const report = {
    ok: failed === 0,
    passed,
    failed,
    total,
    multiField: {
      suites: multi.suites,
      passed: multi.passed,
      failed: multi.failed,
    },
    results: Object.fromEntries(state.results),
  };
  window.__HARNESS_LAST_REPORT__ = report;
  return report;
}

async function bootstrap() {
  window.addEventListener('error', event => {
    window.__HARNESS_PAGE_ERRORS__ = window.__HARNESS_PAGE_ERRORS__ || [];
    window.__HARNESS_PAGE_ERRORS__.push(event.message || String(event.error || 'error'));
  });
  window.addEventListener('unhandledrejection', event => {
    window.__HARNESS_PAGE_ERRORS__ = window.__HARNESS_PAGE_ERRORS__ || [];
    window.__HARNESS_PAGE_ERRORS__.push(String(event.reason || 'unhandledrejection'));
  });

  state.goldens = await loadGoldensManifest();

  const res = await fetch('/api/examples');
  const data = await res.json();
  state.examples = data.examples || [];

  const ul = listEl();
  ul.innerHTML = '';
  for (const ex of state.examples) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = ex.id;
    button.textContent = ex.name;
    button.addEventListener('click', async () => {
      clearLog();
      log(`Loading ${ex.id}…`);
      try {
        const result = await verifyExample(ex.id);
        log(result.ok ? 'PASS (对拍 ok)' : 'FAIL');
        for (const issue of result.issues) log(`  - ${issue}`);
      } catch (error) {
        log(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    li.appendChild(button);
    ul.appendChild(li);
  }

  document.getElementById('btn-run-all').addEventListener('click', () => {
    void runAll();
  });

  window.__SQLSUGAR_HARNESS__ = {
    runAll,
    verifyExample,
    verifyMultiFieldCases,
    loadExample,
    applyOverrides,
    getReport: () => window.__HARNESS_LAST_REPORT__ || null,
    listExamples: () => state.examples.slice(),
    getGoldens: () => state.goldens,
  };

  await waitForApp();
  const suiteCount = Array.isArray(state.goldens?.multiFieldSuites)
    ? state.goldens.multiFieldSuites.length
    : state.goldens?.multiField
      ? 1
      : 0;
  const caseCount = Array.isArray(state.goldens?.multiFieldSuites)
    ? state.goldens.multiFieldSuites.reduce((n, s) => n + (s.cases?.length || 0), 0)
    : state.goldens?.multiField?.cases?.length || 0;
  if (!state.goldens) {
    log(
      `Ready. ${state.examples.length} examples. WARNING: goldens missing — run pnpm run harness:templated-sql:goldens`
    );
  } else {
    log(
      `Ready. ${state.examples.length} examples + ${caseCount} multi-field cases across ${suiteCount} suites.`
    );
  }

  const params = new URLSearchParams(location.search);
  if (params.get('autorun') === '1') {
    await runAll();
  }
}

void bootstrap();
