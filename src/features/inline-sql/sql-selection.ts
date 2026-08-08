import * as vscode from 'vscode';
import { LanguageHandler, LanguageType } from './language-handler';

export interface SqlSelectionOptions {
  autoExpand?: boolean;
  /** When true, editor selection includes quote delimiters (rewrite always uses full literal). */
  includeSurroundingQuotes?: boolean;
}

export interface ResolvedSqlSelection {
  selection: vscode.Selection;
  /** Document text for the rewrite range (always includes quotes + prefix when found). */
  text: string;
  expanded: boolean;
  normalized: boolean;
}

export interface TextRange {
  start: number;
  end: number;
}

/**
 * Resolve the SQL string selection for Inline / Templated commands:
 * - empty selection → expand to enclosing host-language string literal
 * - non-empty selection → normalize quote / prefix boundaries when possible
 */
export function resolveSqlSelection(
  document: vscode.TextDocument,
  selection: vscode.Selection,
  languageHandler: LanguageHandler,
  options: SqlSelectionOptions = {}
): ResolvedSqlSelection | null {
  const autoExpand = options.autoExpand !== false;
  const language = languageHandler.detectLanguage(document);
  const text = document.getText();

  if (!selection.isEmpty) {
    const normalized = normalizeExistingSelection(
      document,
      selection,
      text,
      language,
      languageHandler
    );
    if (normalized) {
      return normalized;
    }
    const raw = document.getText(selection);
    if (raw.trim().length === 0) {
      return null;
    }
    return {
      selection,
      text: raw,
      expanded: false,
      normalized: false,
    };
  }

  if (!autoExpand) {
    return null;
  }

  const offset = document.offsetAt(selection.active);
  const range = findEnclosingStringLiteral(text, offset, language);
  if (!range) {
    return null;
  }

  const start = document.positionAt(range.start);
  const end = document.positionAt(range.end);
  const fullSelection = new vscode.Selection(start, end);
  const fullText = document.getText(fullSelection);

  return {
    selection: fullSelection,
    text: fullText,
    expanded: true,
    normalized: false,
  };
}

function normalizeExistingSelection(
  document: vscode.TextDocument,
  selection: vscode.Selection,
  fullText: string,
  language: LanguageType,
  languageHandler: LanguageHandler
): ResolvedSqlSelection | null {
  const raw = document.getText(selection);
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const stripped = languageHandler.stripQuotes(trimmed);
  // Already looks like a quoted literal (with optional prefix).
  if (stripped !== trimmed && looksLikeQuotedLiteral(trimmed)) {
    if (raw === trimmed) {
      return {
        selection,
        text: raw,
        expanded: false,
        normalized: false,
      };
    }
    // Trim whitespace around the selection.
    const startOffset = document.offsetAt(selection.start) + raw.indexOf(trimmed);
    const endOffset = startOffset + trimmed.length;
    return {
      selection: new vscode.Selection(
        document.positionAt(startOffset),
        document.positionAt(endOffset)
      ),
      text: trimmed,
      expanded: false,
      normalized: true,
    };
  }

  // Selection is inner content (missing quotes) — expand to enclosing literal.
  const mid =
    document.offsetAt(selection.start) + Math.floor((document.offsetAt(selection.end) - document.offsetAt(selection.start)) / 2);
  const enclosing = findEnclosingStringLiteral(fullText, mid, language);
  if (!enclosing) {
    return null;
  }
  const enclosingText = fullText.slice(enclosing.start, enclosing.end);
  const inner = languageHandler.stripQuotes(enclosingText);
  // Only accept if selected text matches the inner content (allowing whitespace trim).
  if (inner.trim() !== trimmed && !inner.includes(trimmed) && trimmed !== inner) {
    // Still expand if selection is strictly inside the literal.
    const selStart = document.offsetAt(selection.start);
    const selEnd = document.offsetAt(selection.end);
    if (selStart < enclosing.start || selEnd > enclosing.end) {
      return null;
    }
  }

  return {
    selection: new vscode.Selection(
      document.positionAt(enclosing.start),
      document.positionAt(enclosing.end)
    ),
    text: enclosingText,
    expanded: false,
    normalized: true,
  };
}

function looksLikeQuotedLiteral(text: string): boolean {
  return /^(?:[rRuUfFbB]{0,2})(?:'''[\s\S]*'''|"""[\s\S]*"""|'[^]*'|"[^]*"|`[^]*`)$/.test(
    text.trim()
  );
}

/**
 * Find the string literal range that contains `offset` (offset must be inside content or on delimiters).
 */
export function findEnclosingStringLiteral(
  text: string,
  offset: number,
  language: LanguageType
): TextRange | null {
  if (offset < 0 || offset > text.length) {
    return null;
  }

  if (language === 'python') {
    return findPythonLiteral(text, offset);
  }
  if (language === 'javascript' || language === 'typescript') {
    return findJsLiteral(text, offset);
  }

  // Generic: try JS-style then Python-style.
  return findJsLiteral(text, offset) ?? findPythonLiteral(text, offset);
}

function findPythonLiteral(text: string, offset: number): TextRange | null {
  const ranges = collectPythonLiterals(text);
  return ranges.find(r => offset >= r.start && offset <= r.end) ?? null;
}

function collectPythonLiterals(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  let i = 0;
  while (i < text.length) {
    let prefixLen = 0;
    const rest = text.slice(i);
    const prefixMatch = rest.match(/^([rRuUfFbB]{1,2})(?=['"])/);
    if (prefixMatch) {
      prefixLen = prefixMatch[1].length;
    }
    const quoteIndex = i + prefixLen;
    const start = i;

    if (text.startsWith('"""', quoteIndex) || text.startsWith("'''", quoteIndex)) {
      const quote = text.slice(quoteIndex, quoteIndex + 3);
      const end = findClosing(text, quoteIndex + 3, quote);
      if (end !== -1) {
        ranges.push({ start, end: end + 3 });
        i = end + 3;
        continue;
      }
    }

    if (text[quoteIndex] === '"' || text[quoteIndex] === "'") {
      const quote = text[quoteIndex];
      const end = findClosingEscaped(text, quoteIndex + 1, quote);
      if (end !== -1) {
        ranges.push({ start, end: end + 1 });
        i = end + 1;
        continue;
      }
    }

    i += 1;
  }
  return ranges;
}

function findJsLiteral(text: string, offset: number): TextRange | null {
  const ranges = collectJsLiterals(text);
  return ranges.find(r => offset >= r.start && offset <= r.end) ?? null;
}

function collectJsLiterals(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '`' || ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      const contentStart = i + 1;
      const end =
        quote === '`'
          ? findClosingTemplate(text, contentStart)
          : findClosingEscaped(text, contentStart, quote);
      if (end !== -1) {
        ranges.push({ start, end: end + 1 });
        i = end + 1;
        continue;
      }
    }
    i += 1;
  }
  return ranges;
}

function findClosing(text: string, from: number, quote: string): number {
  let i = from;
  while (i < text.length) {
    if (text.startsWith(quote, i)) {
      return i;
    }
    i += 1;
  }
  return -1;
}

function findClosingEscaped(text: string, from: number, quote: string): number {
  let i = from;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === quote) {
      return i;
    }
    if (text[i] === '\n' && (quote === '"' || quote === "'")) {
      // Unterminated single-line string.
      return -1;
    }
    i += 1;
  }
  return -1;
}

function findClosingTemplate(text: string, from: number): number {
  let i = from;
  let braceDepth = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (braceDepth === 0 && ch === '`') {
      return i;
    }
    if (ch === '$' && text[i + 1] === '{') {
      braceDepth += 1;
      i += 2;
      continue;
    }
    if (braceDepth > 0) {
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return -1;
}

export function readSqlSelectionConfig(): SqlSelectionOptions {
  const cfg = vscode.workspace.getConfiguration('sqlsugar');
  return {
    autoExpand: cfg.get<boolean>('selection.autoExpand', true),
    includeSurroundingQuotes: cfg.get<boolean>('selection.includeSurroundingQuotes', false),
  };
}
