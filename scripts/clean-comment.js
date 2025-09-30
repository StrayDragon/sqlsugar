#!/usr/bin/env node
// Remove "//" line comments in a safe way while preserving block comments and essential directives
// - Keeps block comments: /* ... */ (including /** JSDoc */)
// - Keeps line comments containing: @ts-, ts-expect-error, eslint-, <reference
// - Ignores anything inside strings and template literals

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { isAbsolute, join, relative } from 'path'

const ROOT = process.cwd();
const targetDir = process.argv[2] || 'src';

const SHOULD_KEEP_LINE_COMMENT = (text) => {
  const t = text.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  return (
    lower.startsWith('note:') ||
    lower.startsWith('todo:') ||
    lower.startsWith('fixme:') ||
    lower.includes('@ts-') ||
    lower.includes('ts-expect-error') ||
    lower.includes('eslint-disable') ||
    lower.includes('eslint-enable') ||
    lower.includes('<reference')
  );
};

function isTsFile(file) {
  return file.endsWith('.ts') && !file.endsWith('.d.ts');
}

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  writeFileSync(filePath, content, 'utf8');
}

function stripLineCommentsPreservingBlocks(code) {
  const lines = code.split(/\r?\n/);
  let inBlock = false;
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    let i = 0;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;

    // Handle block comments spanning multiple lines
    if (inBlock) {
      const endIdx = line.indexOf('*/');
      if (endIdx !== -1) {
        inBlock = false; // leave block
        // Keep everything up to and including */
        // and continue scanning remainder of the line (may contain //)
        const prefix = line.slice(0, endIdx + 2);
        const rest = line.slice(endIdx + 2);
        // Scan rest for // outside strings
        const strippedRest = stripLineRest(rest);
        lines[li] = prefix + strippedRest;
      } else {
        // Entire line is inside block comment; keep as-is
        continue;
      }
      continue;
    }

    // Detect start of block comment if present before any //
    for (let j = 0; j < line.length - 1; j++) {
      const ch = line[j];
      const next = line[j + 1];
      if (inSingle || inDouble || inTemplate) {
        if (ch === '\\') { j++; continue; }
        if (inSingle && ch === '\'') { inSingle = false; continue; }
        if (inDouble && ch === '"') { inDouble = false; continue; }
        if (inTemplate && ch === '`') { inTemplate = false; continue; }
        continue;
      }
      if (ch === '\'') { inSingle = true; continue; }
      if (ch === '"') { inDouble = true; continue; }
      if (ch === '`') { inTemplate = true; continue; }
      if (ch === '/' && next === '*') { inBlock = true; break; }
    }

    if (inBlock) {
      // Re-run this line to handle prefix before block
      const blockStart = line.indexOf('/*');
      const before = line.slice(0, blockStart);
      const afterBlock = line.slice(blockStart);
      const strippedBefore = stripLineRest(before);
      // Keep block start and rest of line as-is (block will be closed in later lines)
      lines[li] = strippedBefore + afterBlock;
      continue;
    }

    // No active block -> strip // safely on this line
    lines[li] = stripLineRest(line);
  }

  return lines.join('\n');

  function stripLineRest(line) {
    let inS = false, inD = false, inT = false;
    for (let k = 0; k < line.length - 1; k++) {
      const ch = line[k];
      const next = line[k + 1];
      if (inS || inD || inT) {
        if (ch === '\\') { k++; continue; }
        if (inS && ch === '\'') { inS = false; continue; }
        if (inD && ch === '"') { inD = false; continue; }
        if (inT && ch === '`') { inT = false; continue; }
        continue;
      }
      if (ch === '\'') { inS = true; continue; }
      if (ch === '"') { inD = true; continue; }
      if (ch === '`') { inT = true; continue; }
      if (ch === '/' && next === '/') {
        const commentText = line.slice(k + 2);
        if (SHOULD_KEEP_LINE_COMMENT(commentText)) {
          return line; // keep as-is
        }
        return line.slice(0, k).replace(/[ \t]+$/, '');
      }
    }
    return line;
  }
}

function walk(dir) {
  const abs = isAbsolute(dir) ? dir : join(ROOT, dir);
  const entries = readdirSync(abs, { withFileTypes: true });
  for (const e of entries) {
    const p = join(abs, e.name);
    if (e.isDirectory()) {
      walk(p);
    } else if (e.isFile() && isTsFile(p)) {
      const before = readFile(p);
      let after = stripLineCommentsPreservingBlocks(before);
      // Remove trailing spaces introduced by comment stripping
      after = after.replace(/[ \t]+(?=\r?\n)/g, '');
      if (after !== before) {
        writeFile(p, after);
        process.stdout.write(`cleaned: ${relative(ROOT, p)}\n`);
      }
    }
  }
}

walk(targetDir);
process.stdout.write('Done.\n');


