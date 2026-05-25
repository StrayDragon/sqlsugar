import { describe, it, expect } from 'vitest';
import { LanguageHandler } from '../features/inline-sql/language-handler';

describe('LanguageHandler', () => {
  const handler = new LanguageHandler();

  describe('looksLikeSQL', () => {
    it('should detect basic SQL keywords', () => {
      expect(handler.looksLikeSQL('SELECT * FROM users')).toBe(true);
      expect(handler.looksLikeSQL('INSERT INTO table VALUES (1)')).toBe(true);
      expect(handler.looksLikeSQL('UPDATE users SET name = "test"')).toBe(true);
      expect(handler.looksLikeSQL('DELETE FROM users WHERE id = 1')).toBe(true);
    });

    it('should reject non-SQL content', () => {
      expect(handler.looksLikeSQL('hello world')).toBe(false);
      expect(handler.looksLikeSQL('const x = 42')).toBe(false);
      expect(handler.looksLikeSQL('')).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      expect(handler.looksLikeSQL('select * from users')).toBe(true);
      expect(handler.looksLikeSQL('Select * From Users')).toBe(true);
    });
  });

  describe('detectQuoteType', () => {
    it('should detect single quotes', () => {
      expect(handler.detectQuoteType("'SELECT 1'")).toBe('single');
    });

    it('should detect double quotes', () => {
      expect(handler.detectQuoteType('"SELECT 1"')).toBe('double');
    });

    it('should detect triple-double quotes', () => {
      expect(handler.detectQuoteType('"""SELECT 1"""')).toBe('triple-double');
    });

    it('should detect triple-single quotes', () => {
      expect(handler.detectQuoteType("'''SELECT 1'''")).toBe('triple-single');
    });

    it('should detect backticks', () => {
      expect(handler.detectQuoteType('`SELECT 1`')).toBe('backtick');
    });
  });

  describe('stripQuotes', () => {
    it('should strip single quotes', () => {
      expect(handler.stripQuotes("'SELECT 1'")).toBe('SELECT 1');
    });

    it('should strip double quotes', () => {
      expect(handler.stripQuotes('"SELECT 1"')).toBe('SELECT 1');
    });

    it('should strip triple quotes', () => {
      expect(handler.stripQuotes('"""SELECT 1"""')).toBe('SELECT 1');
    });

    it('should strip backticks', () => {
      expect(handler.stripQuotes('`SELECT 1`')).toBe('SELECT 1');
    });

    it('should handle Python prefix', () => {
      const result = handler.stripQuotes('f"SELECT {id}"');
      expect(result).toBe('SELECT {id}');
    });

    it('should return content as-is if no quotes', () => {
      expect(handler.stripQuotes('SELECT 1')).toBe('SELECT 1');
    });
  });

  describe('extractPrefix', () => {
    it('should extract f-string prefix', () => {
      expect(handler.extractPrefix('f"text"')).toBe('f');
    });

    it('should extract r-string prefix', () => {
      expect(handler.extractPrefix('r"text"')).toBe('r');
    });

    it('should extract combined prefix', () => {
      expect(handler.extractPrefix('rf"text"')).toBe('rf');
    });

    it('should return empty for no prefix', () => {
      expect(handler.extractPrefix('"text"')).toBe('');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Python from languageId', () => {
      const mockDoc = { languageId: 'python', fileName: 'test.py' } as never;
      expect(handler.detectLanguage(mockDoc)).toBe('python');
    });

    it('should detect TypeScript from languageId', () => {
      const mockDoc = { languageId: 'typescript', fileName: 'test.ts' } as never;
      expect(handler.detectLanguage(mockDoc)).toBe('typescript');
    });

    it('should detect JavaScript from languageId', () => {
      const mockDoc = { languageId: 'javascript', fileName: 'test.js' } as never;
      expect(handler.detectLanguage(mockDoc)).toBe('javascript');
    });

    it('should fall back to generic for unknown', () => {
      const mockDoc = { languageId: 'rust', fileName: 'test.rs' } as never;
      expect(handler.detectLanguage(mockDoc)).toBe('generic');
    });
  });
});
