#!/usr/bin/env node
/**
 * Same-origin static server for Templated SQL Editor harness.
 * Serves: harness UI, dist/templated-sql-editor bundle, dist/resources, examples.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.join(__dirname, 'public');
const EXAMPLES_DIR = path.join(ROOT, 'examples/jinja2VisualEditor');
const PORT = Number(process.env.HARNESS_PORT || 4177);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function listExamples() {
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(name => ({
      id: name,
      name,
      path: `/examples/${name}`,
    }));
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
}

async function loadPrepare() {
  const prepareJs = path.join(__dirname, 'dist/prepare.cjs');
  if (!fs.existsSync(prepareJs)) {
    throw new Error(
      `Missing ${prepareJs}. Run: node harness/templated-sql-editor/build-prepare.mjs`
    );
  }
  const require = createRequire(import.meta.url);
  return require(prepareJs);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/api/examples') {
      sendJson(res, 200, { examples: listExamples() });
      return;
    }

    if (pathname.startsWith('/api/prepare/')) {
      const id = pathname.slice('/api/prepare/'.length);
      if (!/^[A-Za-z0-9._-]+\.sql$/.test(id)) {
        sendJson(res, 400, { error: 'invalid example id' });
        return;
      }
      const filePath = path.join(EXAMPLES_DIR, id);
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: 'example not found' });
        return;
      }
      const template = fs.readFileSync(filePath, 'utf8');
      const { prepareExample } = await loadPrepare();
      const prepared = prepareExample(template);
      sendJson(res, 200, { id, ...prepared });
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      sendFile(res, path.join(PUBLIC, 'index.html'));
      return;
    }

    if (pathname.startsWith('/harness/')) {
      sendFile(res, path.join(PUBLIC, pathname.slice('/harness/'.length)));
      return;
    }

    if (pathname.startsWith('/dist/')) {
      sendFile(res, path.join(ROOT, pathname.slice(1)));
      return;
    }

    if (pathname.startsWith('/examples/')) {
      sendFile(res, path.join(EXAMPLES_DIR, pathname.slice('/examples/'.length)));
      return;
    }

    res.writeHead(404).end('Not found');
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[templated-sql-harness] http://127.0.0.1:${PORT}/`);
  console.log(`[templated-sql-harness] examples: ${listExamples().length}`);
});
