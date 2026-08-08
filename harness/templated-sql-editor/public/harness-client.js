/**
 * Browser-side harness client.
 * Loads examples via /api/prepare/*, posts the same `init` message the VS Code
 * webview uses, then inspects the Lit editor for render errors.
 */

const CRITICAL_LOG_CATEGORIES = [
  'NUNJUCKS_ERROR',
  'TEMPLATE_RENDER_ERROR',
  'TSE_EDITOR_ERROR',
  'PLACEHOLDER_DETECTED',
  'PLACEHOLDER_IN_HTML',
];

const state = {
  examples: [],
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

  // Non-empty templates should produce some preview output after init.
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

  // Allow Lit updates + nunjucks render.
  await wait(150);
  const editor = getEditor(app);
  // Force one more render cycle in case init raced.
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

async function verifyExample(id) {
  const { prepared, editor } = await loadExample(id);
  const { rendered, issues } = inspectEditor(editor);

  if (prepared.warnings?.length) {
    // Preparation warnings are informational unless render also fails.
    for (const w of prepared.warnings) {
      log(`  warn[${id}]: ${w}`);
    }
  }

  const ok = issues.length === 0;
  state.results.set(id, { ok, issues, renderedLength: rendered.length });
  const btn = document.querySelector(`#example-list button[data-id="${CSS.escape(id)}"]`);
  if (btn) {
    btn.classList.toggle('pass', ok);
    btn.classList.toggle('fail', !ok);
  }
  return { id, ok, issues, renderedLength: rendered.length };
}

async function runAll() {
  clearLog();
  state.results.clear();
  const btn = document.getElementById('btn-run-all');
  btn.disabled = true;
  summaryEl().textContent = 'Running…';
  summaryEl().className = '';

  const pageErrors = [];
  window.__HARNESS_PAGE_ERRORS__ = pageErrors;

  let passed = 0;
  let failed = 0;

  for (const ex of state.examples) {
    log(`→ ${ex.id}`);
    try {
      const result = await verifyExample(ex.id);
      if (result.ok) {
        passed += 1;
        log(`  PASS (${result.renderedLength} chars)`);
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

  const summary = `${passed} passed, ${failed} failed / ${state.examples.length}`;
  summaryEl().textContent = summary;
  summaryEl().className = failed === 0 ? 'ok' : 'fail';
  log(`\n${summary}`);
  btn.disabled = false;

  const report = {
    ok: failed === 0,
    passed,
    failed,
    total: state.examples.length,
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
        log(result.ok ? 'PASS' : 'FAIL');
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
    loadExample,
    getReport: () => window.__HARNESS_LAST_REPORT__ || null,
    listExamples: () => state.examples.slice(),
  };

  await waitForApp();
  log(`Ready. ${state.examples.length} examples.`);

  const params = new URLSearchParams(location.search);
  if (params.get('autorun') === '1') {
    await runAll();
  }
}

void bootstrap();
