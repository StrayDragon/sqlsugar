import { describe, it, expect } from 'vitest';
import { findEnclosingStringLiteral } from '../features/inline-sql/sql-selection';

describe('findEnclosingStringLiteral', () => {
  describe('python', () => {
    it('expands cursor inside triple-double quoted SQL', () => {
      const text = 'sql = """SELECT * FROM users"""\n';
      const offset = text.indexOf('SELECT') + 2;
      const range = findEnclosingStringLiteral(text, offset, 'python');
      expect(range).toEqual({
        start: text.indexOf('"""'),
        end: text.lastIndexOf('"""') + 3,
      });
    });

    it('includes f-string prefix in the range', () => {
      const text = 'q = f"""SELECT {id} FROM t"""\n';
      const offset = text.indexOf('SELECT') + 1;
      const range = findEnclosingStringLiteral(text, offset, 'python');
      expect(range).not.toBeNull();
      expect(text.slice(range!.start, range!.end)).toBe('f"""SELECT {id} FROM t"""');
    });

    it('returns null when cursor is outside any string', () => {
      const text = 'x = 1\nsql = """SELECT 1"""\n';
      expect(findEnclosingStringLiteral(text, 1, 'python')).toBeNull();
    });

    it('handles single-quoted strings', () => {
      const text = "s = 'SELECT 1'\n";
      const offset = text.indexOf('SELECT');
      const range = findEnclosingStringLiteral(text, offset, 'python');
      expect(text.slice(range!.start, range!.end)).toBe("'SELECT 1'");
    });
  });

  describe('javascript/typescript', () => {
    it('expands inside template literals', () => {
      const text = 'const q = `SELECT * FROM users`;\n';
      const offset = text.indexOf('FROM');
      const range = findEnclosingStringLiteral(text, offset, 'typescript');
      expect(text.slice(range!.start, range!.end)).toBe('`SELECT * FROM users`');
    });

    it('handles template literals with ${} interpolations', () => {
      const text = 'const q = `SELECT ${col} FROM t`;\n';
      const offset = text.indexOf('FROM');
      const range = findEnclosingStringLiteral(text, offset, 'javascript');
      expect(text.slice(range!.start, range!.end)).toBe('`SELECT ${col} FROM t`');
    });

    it('handles double-quoted strings', () => {
      const text = 'const q = "SELECT 1";\n';
      const offset = text.indexOf('SELECT');
      const range = findEnclosingStringLiteral(text, offset, 'javascript');
      expect(text.slice(range!.start, range!.end)).toBe('"SELECT 1"');
    });
  });

  describe('go', () => {
    it('expands inside raw backtick strings', () => {
      const text = 'q := `SELECT * FROM users`\n';
      const offset = text.indexOf('FROM');
      const range = findEnclosingStringLiteral(text, offset, 'go');
      expect(text.slice(range!.start, range!.end)).toBe('`SELECT * FROM users`');
    });

    it('expands inside interpreted strings', () => {
      const text = 'q := "SELECT 1"\n';
      const offset = text.indexOf('SELECT');
      const range = findEnclosingStringLiteral(text, offset, 'go');
      expect(text.slice(range!.start, range!.end)).toBe('"SELECT 1"');
    });
  });
});
