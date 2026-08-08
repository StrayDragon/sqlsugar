/**
 * Normalize rendered SQL for stable 对拍 (golden comparison).
 * Preserves SQL string contents; only normalizes line endings / trailing ws / EOF.
 */
export function normalizeRenderedSql(text) {
  return `${String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

/**
 * Diff two normalized SQL strings; return null if equal, else a short report.
 */
export function diffNormalized(actual, expected, { maxLines = 12 } = {}) {
  const a = normalizeRenderedSql(actual);
  const e = normalizeRenderedSql(expected);
  if (a === e) return null;

  const aLines = a.split('\n');
  const eLines = e.split('\n');
  const max = Math.max(aLines.length, eLines.length);
  const chunks = [];
  let shown = 0;
  for (let i = 0; i < max && shown < maxLines; i += 1) {
    if (aLines[i] === eLines[i]) continue;
    chunks.push(`@@ line ${i + 1}`);
    chunks.push(`- ${eLines[i] ?? '<missing>'}`);
    chunks.push(`+ ${aLines[i] ?? '<missing>'}`);
    shown += 1;
  }
  if (shown === 0) {
    chunks.push(`length mismatch: actual=${a.length} expected=${e.length}`);
  } else if (shown >= maxLines) {
    chunks.push('… (truncated)');
  }
  return chunks.join('\n');
}
