import { describe, it, expect } from 'vitest';
import { TemplatePreprocessor } from '../features/sql-intelligence/template-preprocessor';
import { SQLParserService } from '../features/sql-intelligence/parser-service';
import { SQLFormatterService } from '../features/sql-intelligence/formatter-service';

describe('TemplatePreprocessor', () => {
  const preprocessor = new TemplatePreprocessor();

  it('should replace {{ variable }} with placeholders', () => {
    const result = preprocessor.preprocess('SELECT {{ column }} FROM {{ table }}');
    expect(result.processedSQL).toContain('__J2_VAR_0__');
    expect(result.processedSQL).toContain('__J2_VAR_1__');
    expect(result.processedSQL).not.toContain('{{');
    expect(result.placeholders).toHaveLength(2);
  });

  it('should replace {% %} blocks with comments', () => {
    const result = preprocessor.preprocess('SELECT * {% if active %}WHERE active = true{% endif %}');
    expect(result.processedSQL).toContain('/* __J2_BLOCK_');
    expect(result.processedSQL).not.toContain('{%');
  });

  it('should handle mixed template syntax', () => {
    const template = `SELECT {{ col }}
FROM users
{% if filter %}WHERE {{ filter_col }} = {{ filter_val }}{% endif %}`;
    const result = preprocessor.preprocess(template);
    expect(result.processedSQL).not.toContain('{{');
    expect(result.processedSQL).not.toContain('{%');
    expect(result.placeholders.length).toBeGreaterThan(0);
  });
});

describe('SQLParserService', () => {
  const parser = new SQLParserService();

  it('should parse valid SQL', () => {
    const result = parser.parse('SELECT id, name FROM users WHERE id = 1', 'mysql');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid SQL', () => {
    const result = parser.parse('SELEC FROM', 'mysql');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle SQL with Jinja2 templates', () => {
    const result = parser.parse('SELECT * FROM {{ table_name }} WHERE id = {{ id }}', 'mysql');
    // After preprocessing, the SQL should be parseable (placeholders are identifiers)
    expect(result.preprocessResult.placeholders).toHaveLength(2);
  });

  it('should list supported dialects', () => {
    const dialects = parser.getSupportedDialects();
    expect(dialects).toContain('mysql');
    expect(dialects).toContain('postgresql');
    expect(dialects).toContain('sqlite');
  });
});

describe('SQLFormatterService', () => {
  const formatter = new SQLFormatterService();

  it('should format simple SELECT', () => {
    const result = formatter.format('select id,name from users where id=1');
    expect(result).toContain('SELECT');
    expect(result).toContain('FROM');
    expect(result).toContain('WHERE');
  });

  it('should respect keyword case option', () => {
    const upper = formatter.format('select * from users', { keywordCase: 'upper' });
    expect(upper).toContain('SELECT');
    const lower = formatter.format('SELECT * FROM users', { keywordCase: 'lower' });
    expect(lower).toContain('select');
  });

  it('should list supported languages', () => {
    const langs = formatter.getSupportedLanguages();
    expect(langs).toContain('mysql');
    expect(langs).toContain('postgresql');
  });
});
