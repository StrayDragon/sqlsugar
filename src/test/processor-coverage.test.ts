import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateProcessor } from '../features/templated-sql/processor';

describe('TemplateProcessor - Coverage Tests', () => {
  let processor: TemplateProcessor;

  beforeEach(() => {
    processor = TemplateProcessor.getInstance();
    processor.clearCaches();
  });

  describe('inferVariableType', () => {
    it('should infer boolean type for is_ prefixed variables', () => {
      const vars = processor.extractVariables('{{ is_active }}');
      expect(vars[0]?.type).toBe('boolean');
    });

    it('should infer boolean type for has_ prefixed variables', () => {
      const vars = processor.extractVariables('{{ has_permission }}');
      expect(vars[0]?.type).toBe('boolean');
    });

    it('should infer boolean type for enabled/disabled keywords', () => {
      const vars = processor.extractVariables('{{ feature_enabled }}');
      expect(vars[0]?.type).toBe('boolean');
    });

    it('should infer number type for _id suffixed variables', () => {
      const vars = processor.extractVariables('{{ user_id }}');
      expect(vars[0]?.type).toBe('number');
    });

    it('should infer number type for count/amount variables', () => {
      const vars = processor.extractVariables('{{ item_count }}');
      expect(vars[0]?.type).toBe('number');
    });

    it('should infer date type for date-related variables', () => {
      const vars = processor.extractVariables('{{ created_date }}');
      expect(vars[0]?.type).toBe('date');
    });

    it('should infer date type for _at suffixed variables', () => {
      const vars = processor.extractVariables('{{ updated_at }}');
      expect(vars[0]?.type).toBe('date');
    });

    it('should default to string type', () => {
      const vars = processor.extractVariables('{{ username }}');
      expect(vars[0]?.type).toBe('string');
    });
  });

  describe('getDefaultValue', () => {
    it('should return ID default for id variables', () => {
      const vars = processor.extractVariables('{{ user_id }}');
      expect(vars[0]?.defaultValue).toBe(123);
    });

    it('should return count default for count variables', () => {
      const vars = processor.extractVariables('{{ item_count }}');
      expect(vars[0]?.defaultValue).toBe(1);
    });

    it('should return price default for financial variables', () => {
      const vars = processor.extractVariables('{{ total_price }}');
      expect(vars[0]?.defaultValue).toBe(99.99);
    });

    it('should return email default for email variables', () => {
      const vars = processor.extractVariables('{{ user_email }}');
      expect(vars[0]?.defaultValue).toMatch(/@example\.com$/);
    });

    it('should return name default for name variables', () => {
      const vars = processor.extractVariables('{{ full_name }}');
      expect(vars[0]?.defaultValue).toMatch(/Name|名称/);
    });

    it('should return boolean true for is_ variables', () => {
      const vars = processor.extractVariables('{{ is_active }}');
      expect(vars[0]?.defaultValue).toBe(true);
    });

    it('should return boolean false for negative patterns', () => {
      const vars = processor.extractVariables('{{ is_deleted }}');
      expect(vars[0]?.defaultValue).toBe(false);
    });

    it('should return today date for creation variables', () => {
      const vars = processor.extractVariables('{{ creation_date }}');
      expect(vars[0]?.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return birth date default', () => {
      const vars = processor.extractVariables('{{ birth_date }}');
      expect(vars[0]?.defaultValue).toBe('1990-01-01');
    });

    it('should return URL default for url variables', () => {
      const vars = processor.extractVariables('{{ website_url }}');
      expect(vars[0]?.defaultValue).toMatch(/^https?:\/\//);
    });
  });

  describe('generateDemoSQL', () => {
    it('should generate SQL with default values', () => {
      const result = processor.generateDemoSQL(
        'SELECT * FROM users WHERE id = {{ user_id }}'
      );
      expect(result.sql).toContain('1');
      expect(result.variables).toBeDefined();
      expect(result.variables.length).toBeGreaterThan(0);
    });

    it('should handle multiple variables', () => {
      const result = processor.generateDemoSQL(
        'SELECT * FROM {{ table_name }} WHERE status = {{ status }}'
      );
      expect(result.sql).toBeDefined();
      expect(result.variables.length).toBe(2);
    });
  });

  describe('validateTemplate', () => {
    it('should validate simple template', () => {
      const result = processor.validateTemplate('SELECT * FROM users');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate template with variables', () => {
      const result = processor.validateTemplate('SELECT * FROM {{ table }}');
      expect(result.valid).toBe(true);
    });

    it('should return valid for nunjucks-compatible templates', () => {
      // nunjucks is very permissive with syntax
      const result = processor.validateTemplate('{{ variable }}');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should use cache for repeated validations', () => {
      const template = 'SELECT * FROM {{ table }}';
      const result1 = processor.validateTemplate(template);
      const result2 = processor.validateTemplate(template);
      expect(result1).toEqual(result2);
    });
  });

  describe('getTemplatePreview', () => {
    it('should return short template as-is', () => {
      const preview = processor.getTemplatePreview('SELECT * FROM users');
      expect(preview).toBe('SELECT * FROM users');
    });

    it('should truncate long template', () => {
      const longTemplate = 'A'.repeat(200);
      const preview = processor.getTemplatePreview(longTemplate, 100);
      expect(preview.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(preview).toContain('...');
    });

    it('should normalize whitespace in template preview', () => {
      const preview = processor.getTemplatePreview('SELECT {{ col1 }}, {{ col2 }} FROM table');
      // Whitespace after opening braces is removed
      expect(preview).toContain('{{col1');
      expect(preview).toContain('{{col2');
    });
  });

  describe('getSupportedFilters', () => {
    it('should return array of filter names', () => {
      const filters = processor.getSupportedFilters();
      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBeGreaterThan(0);
    });

    it('should include common filters', () => {
      const filters = processor.getSupportedFilters();
      expect(filters).toContain('upper');
      expect(filters).toContain('lower');
      expect(filters).toContain('trim');
      expect(filters).toContain('default');
    });

    it('should include SQL-specific filters', () => {
      const filters = processor.getSupportedFilters();
      expect(filters).toContain('sql_quote');
      expect(filters).toContain('sql_identifier');
    });
  });

  describe('getSupportedFeatures', () => {
    it('should return array of feature descriptions', () => {
      const features = processor.getSupportedFeatures();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should include template features', () => {
      const features = processor.getSupportedFeatures();
      expect(features.some(f => f.includes('variable'))).toBe(true);
      expect(features.some(f => f.includes('if'))).toBe(true);
    });
  });

  describe('renderWithCustomVariables', () => {
    it('should render with custom variables', () => {
      const result = processor.renderWithCustomVariables(
        'Hello {{ name }}!',
        { name: 'World' }
      );
      expect(result).toBe('Hello World!');
    });
  });

  describe('Cache operations', () => {
    it('should clear all caches', () => {
      processor.extractVariables('{{ var1 }}');
      processor.validateTemplate('{{ var1 }}');
      processor.clearCaches();
      // Should work without errors after cache clear
      const vars = processor.extractVariables('{{ var1 }}');
      expect(vars.length).toBeGreaterThan(0);
    });

    it('should clear variable cache only', () => {
      processor.extractVariables('{{ var1 }}');
      processor.clearVariableCache();
      const vars = processor.extractVariables('{{ var1 }}');
      expect(vars.length).toBeGreaterThan(0);
    });

    it('should clear template cache only', () => {
      processor.validateTemplate('{{ var1 }}');
      processor.clearTemplateCache();
      const result = processor.validateTemplate('{{ var1 }}');
      expect(result.valid).toBe(true);
    });

    it('should return cache metrics', () => {
      const metrics = processor.getCacheMetrics();
      expect(metrics).toHaveProperty('variableCache');
      expect(metrics).toHaveProperty('templateCache');
    });
  });

  describe('renderTemplate error handling', () => {
    it('should handle unknown filter gracefully', () => {
      const result = processor.renderTemplate(
        '{{ name|unknown_filter }}',
        { name: 'test' }
      );
      expect(result).toBeDefined();
    });

    it('should extract string from quoted value on filter error', () => {
      const result = processor.renderTemplate(
        '{{ "hello"|unknown_filter }}',
        {}
      );
      expect(result).toBe('hello');
    });

    it('should extract number from value on filter error', () => {
      const result = processor.renderTemplate(
        '{{ 42|unknown_filter }}',
        {}
      );
      expect(result).toBe('42');
    });
  });
});
