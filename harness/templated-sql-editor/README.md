# Templated SQL Editor Harness

Same-origin browser harness that loads the real `dist/templated-sql-editor` bundle
(the same artifact used by the VS Code webview) and verifies every SQL example under
`examples/jinja2VisualEditor/`.

## What it checks

For each example:

1. Prepare variables the same way the extension does (`TemplateProcessor` + param analyzers).
2. `postMessage({ command: 'init', template, variables })` into `<sqlsugar-templated-sql-app>`.
3. Fail if preview contains `-- [渲染错误]`, preview is empty, critical webview logs fire, or page errors occur.

## Commands

```bash
# one-shot headless self-verify (CI-friendly)
just harness-templated-sql

# or
pnpm run harness:templated-sql

# interactive: build deps, then serve
pnpm run harness:templated-sql:serve
# open http://127.0.0.1:4177/
```

In the page UI: click an example, or **Run All Examples**. Append `?autorun=1` to auto-run.

## Layout

- `public/` — HTML/CSS/client (same origin as `/dist/...`)
- `prepare.ts` — Node-side example preparation (mirrors extension command-handler)
- `server.mjs` — static + `/api/examples` + `/api/prepare/:id`
- `verify.mjs` — Playwright chromium autorun gate
