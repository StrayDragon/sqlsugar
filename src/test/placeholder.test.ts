/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { TemplateProcessor } from '../features/templated-sql/processor';

describe('Variable Inference', () => {
  const processor = TemplateProcessor.getInstance();

  describe('Basic Variable Detection', () => {
    it('should detect variables from basic template', () => {
      const template = `SELECT * FROM users
WHERE id = {{ user_id }}
  AND is_active = {{ is_active }}
  AND email = '{{ email_address }}'
  AND created_at >= '{{ start_date }}'
  AND status IN ({{ status_list }})`;

      const variables = processor.extractVariables(template);

      expect(variables).toHaveLength(5);
      expect(variables.map(v => v.name)).toContain('user_id');
      expect(variables.map(v => v.name)).toContain('is_active');
      expect(variables.map(v => v.name)).toContain('email_address');
      expect(variables.map(v => v.name)).toContain('start_date');
      expect(variables.map(v => v.name)).toContain('status_list');
    });

    it('should infer boolean type correctly', () => {
      const booleanVariables = [
        { name: 'is_active', expected: true },
        { name: 'is_deleted', expected: false },
        { name: 'has_permission', expected: true },
        { name: 'can_edit', expected: true },
        { name: 'enabled', expected: true },
        { name: 'visible', expected: true },
        { name: 'should_process', expected: true },
        { name: 'would_approve', expected: true }
      ];

      booleanVariables.forEach(({ name: varName, expected }) => {
        const variables = processor.extractVariables(`{{ ${varName} }}`);
        const extracted = variables.find(v => v.name === varName);
        expect(extracted?.type).toBe('boolean');
        expect(extracted?.defaultValue).toBe(expected);
      });
    });

    it('should infer number type correctly', () => {
      const numberVariables = [
        { name: 'user_id', expected: 123 },
        { name: 'item_count', expected: 1 },
        { name: 'total_price', expected: 99.99 },
        { name: 'product_cost', expected: 99.99 },
        { name: 'user_age', expected: 25 },
        { name: 'page_size', expected: 100 },
        { name: 'priority_level', expected: 1 }
      ];

      numberVariables.forEach(({ name: varName, expected }) => {
        const variables = processor.extractVariables(`{{ ${varName} }}`);
        const extracted = variables.find(v => v.name === varName);
        expect(extracted?.type).toBe('number');
        expect(extracted?.defaultValue).toBe(expected);
      });
    });

    it('should infer date type correctly', () => {
      const dateVariables = [
        'created_at', 'updated_on', 'start_date', 'end_time',
        'expires_date', 'birth_date', 'scheduled_time'
      ];

      dateVariables.forEach(varName => {
        const variables = processor.extractVariables(`{{ ${varName} }}`);
        const extracted = variables.find(v => v.name === varName);
        expect(extracted?.type).toBe('date');
        expect(extracted?.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should provide meaningful string defaults', () => {
      const stringMappings = [
        ['user_email', 'test@example.com'],
        ['user_name', '示例名称'],
        ['item_title', '示例标题'],
        ['item_description', '示例描述'],
        ['profile_url', 'https://example.com'],
        ['contact_phone', '+1-555-123-4567'],
        ['home_address', '示例地址'],
        ['item_status', 'active']
      ];

      stringMappings.forEach(([varName, expectedDefault]) => {
        const variables = processor.extractVariables(`{{ ${varName} }}`);
        const extracted = variables.find(v => v.name === varName);
        expect(extracted?.type).toBe('string');
        expect(extracted?.defaultValue).toBe(expectedDefault);
      });
    });

    it('should handle filters correctly', () => {
      const template = `SELECT * FROM users
WHERE id = {{ user_id | int }}
  AND name = '{{ user_name | upper | trim }}'
  AND created_at >= '{{ start_date | sql_date }}'`;

      const variables = processor.extractVariables(template);

      const user_id = variables.find(v => v.name === 'user_id');
      const user_name = variables.find(v => v.name === 'user_name');
      const start_date = variables.find(v => v.name === 'start_date');

      expect(user_id?.filters).toContain('int');
      expect(user_name?.filters).toContain('upper');

      expect(start_date?.filters).toContain('sql_date');
    });
  });

  describe('Template Validation', () => {
    it('should validate correct template syntax', () => {
      const validTemplate = `SELECT * FROM users WHERE {{ condition }}`;
      const result = processor.validateTemplate(validTemplate);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should generate demo SQL with reasonable defaults', () => {
      const template = `SELECT * FROM users
WHERE id = {{ user_id }}
  AND is_active = {{ is_active }}
  AND name = '{{ user_name }}'`;

      const result = processor.generateDemoSQL(template);

      expect(result.sql).toContain('123');
      expect(result.sql).toContain('true');
      expect(result.sql).toContain('示例名称');
      expect(result.variables).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template gracefully', () => {
      const result = processor.extractVariables('');
      expect(result).toHaveLength(0);
    });

    it('should handle template without variables', () => {
      const template = 'SELECT * FROM users';
      const result = processor.extractVariables(template);
      expect(result).toHaveLength(0);
    });

    it('should handle duplicate variable names', () => {
      const template = `SELECT * FROM users
WHERE {{ status }} = 'active'
  OR {{ status }} = 'pending'`;

      const variables = processor.extractVariables(template);
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('status');
    });
  });

  describe('Caching Performance', () => {
    it('should cache variable extraction results', () => {
      const template = `SELECT * FROM users WHERE {{ user_id }} AND {{ is_active }}`;


      const start1 = Date.now();
      const variables1 = processor.extractVariables(template);
      const _time1 = Date.now() - start1;


      const start2 = Date.now();
      const variables2 = processor.extractVariables(template);
      const _time2 = Date.now() - start2;


      expect(variables1).toEqual(variables2);
      expect(variables1).toHaveLength(2);


      const metrics = processor.getCacheMetrics();
      expect(metrics.variableCache.hits).toBeGreaterThanOrEqual(1);
      expect(metrics.variableCache.size).toBeGreaterThan(0);
    });

    it('should cache template validation results', () => {
      const template = `SELECT * FROM users WHERE {{ user_id }}`;


      const result1 = processor.validateTemplate(template);


      const result2 = processor.validateTemplate(template);


      expect(result1).toEqual(result2);
      expect(result1.valid).toBe(true);


      const metrics = processor.getCacheMetrics();
      expect(metrics.templateCache.hits).toBeGreaterThanOrEqual(1);
      expect(metrics.templateCache.size).toBeGreaterThan(0);
    });

    it('should provide cache metrics', () => {
      const metrics = processor.getCacheMetrics();

      expect(metrics).toHaveProperty('variableCache');
      expect(metrics).toHaveProperty('templateCache');

      expect(metrics.variableCache).toHaveProperty('hits');
      expect(metrics.variableCache).toHaveProperty('misses');
      expect(metrics.variableCache).toHaveProperty('hitRate');
      expect(metrics.variableCache).toHaveProperty('size');
      expect(metrics.variableCache).toHaveProperty('maxSize');

      expect(metrics.templateCache).toHaveProperty('hits');
      expect(metrics.templateCache).toHaveProperty('misses');
      expect(metrics.templateCache).toHaveProperty('hitRate');
      expect(metrics.templateCache).toHaveProperty('size');
      expect(metrics.templateCache).toHaveProperty('maxSize');
    });

    it('should clear caches', () => {

      processor.extractVariables('{{ user_id }}');
      processor.validateTemplate('SELECT * FROM users');

      let metrics = processor.getCacheMetrics();
      expect(metrics.variableCache.size).toBeGreaterThan(0);
      expect(metrics.templateCache.size).toBeGreaterThan(0);


      processor.clearCaches();

      metrics = processor.getCacheMetrics();
      expect(metrics.variableCache.size).toBe(0);
      expect(metrics.templateCache.size).toBe(0);
    });

    it('should clear specific caches', () => {

      processor.extractVariables('{{ user_id }}');
      processor.validateTemplate('SELECT * FROM users');


      processor.clearVariableCache();
      let metrics = processor.getCacheMetrics();
      expect(metrics.variableCache.size).toBe(0);
      expect(metrics.templateCache.size).toBeGreaterThan(0);


      processor.extractVariables('{{ user_id }}');


      processor.clearTemplateCache();
      metrics = processor.getCacheMetrics();
      expect(metrics.variableCache.size).toBeGreaterThan(0);
      expect(metrics.templateCache.size).toBe(0);
    });
  });
});

