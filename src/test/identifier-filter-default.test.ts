/**
 * Identifier Filter Default Value Tests
 *
 * Verifies that {{ var | identifier }} defaults to the variable name literal.
 */

import { describe, it, expect } from 'vitest';
import { parseTemplate } from '../features/templated-sql/ui/utils/template-parser';
import { getContextualDefaultValue } from '../features/templated-sql/ui/utils/variable-utils';
import { VariableStateManager } from '../features/templated-sql/ui/utils/variable-state-manager';
import { TemplateProcessor } from '../features/templated-sql/processor';

describe('Identifier Filter Default Value', () => {
  describe('parseTemplate captures filters', () => {
    it('should capture identifier filter from {{ user | identifier }}', () => {
      const result = parseTemplate('{{ user | identifier }}');
      const userVar = result.variables.find(v => v.name === 'user');
      expect(userVar).toBeDefined();
      expect(userVar?.filters).toContain('identifier');
    });

    it('should capture sql_identifier filter', () => {
      const result = parseTemplate('{{ table | sql_identifier }}');
      const tableVar = result.variables.find(v => v.name === 'table');
      expect(tableVar?.filters).toContain('sql_identifier');
    });

    it('should capture chained filters', () => {
      const result = parseTemplate('{{ name | trim | identifier }}');
      const nameVar = result.variables.find(v => v.name === 'name');
      expect(nameVar?.filters).toContain('trim');
      expect(nameVar?.filters).toContain('identifier');
    });

    it('should not have filters for plain variable', () => {
      const result = parseTemplate('{{ name }}');
      const nameVar = result.variables.find(v => v.name === 'name');
      expect(nameVar?.filters).toEqual([]);
    });
  });

  describe('getContextualDefaultValue', () => {
    it('should return variable name literal for identifier filter', () => {
      const result = parseTemplate('{{ user | identifier }}');
      const userVar = result.variables.find(v => v.name === 'user')!;
      expect(getContextualDefaultValue(userVar)).toBe('user');
    });

    it('should return variable name literal for sql_identifier filter', () => {
      const result = parseTemplate('{{ table | sql_identifier }}');
      const tableVar = result.variables.find(v => v.name === 'table')!;
      expect(getContextualDefaultValue(tableVar)).toBe('table');
    });

    it('should use last segment for dotted name', () => {
      const result = parseTemplate('{{ user.id | identifier }}');
      const userIdVar = result.variables.find(v => v.name === 'user.id')!;
      expect(getContextualDefaultValue(userIdVar)).toBe('id');
    });

    it('should NOT use name literal when identifier filter is absent', () => {
      const result = parseTemplate('{{ user }}');
      const userVar = result.variables.find(v => v.name === 'user')!;
      // Falls back to normal contextual default (contains 'user' name → 'Sample Name' or similar)
      expect(getContextualDefaultValue(userVar)).not.toBe('user');
    });
  });

  describe('VariableStateManager integration', () => {
    it('should use variable name literal as initial value for identifier filter', () => {
      const result = parseTemplate('{{ user | identifier }}');
      const manager = new VariableStateManager();
      manager.initialize(result.variables);

      const value = manager.getValue('user');
      expect(value).toBe('user');
    });

    it('should use variable name literal for real-world SQL template', () => {
      const template = `SELECT * FROM orders o
LEFT JOIN {{ user | identifier }} AS u ON u.id = o.user_id
WHERE o.status = {{ status | sql_quote }}`;
      const result = parseTemplate(template);
      const manager = new VariableStateManager();
      manager.initialize(result.variables);

      expect(manager.getValue('user')).toBe('user');
    });

    it('should generate a meaningful sample array for for-loop collection', () => {
      const template = `{% for cat in categories if cat.is_active %}
  {{ cat.id }}{% if not loop.last %}, {% endif %}
{% endfor %}`;
      const result = parseTemplate(template);
      const categoriesVar = result.variables.find(v => v.name === 'categories')!;

      expect(categoriesVar.type).toBe('array');
      expect(categoriesVar.elementProperties).toContain('id');
      expect(categoriesVar.elementProperties).toContain('is_active');

      // The default value should be an array of objects reflecting those properties
      const defaultValue = getContextualDefaultValue(categoriesVar);
      expect(Array.isArray(defaultValue)).toBe(true);
      expect((defaultValue as Record<string, unknown>[]).length).toBeGreaterThan(0);
      const first = (defaultValue as Record<string, unknown>[])[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('is_active');
    });

    it('should use the sample array as the initial VariableStateManager value', () => {
      const template = `{% for cat in categories %}{{ cat.id }}{% endfor %}`;
      const result = parseTemplate(template);
      const manager = new VariableStateManager();
      manager.initialize(result.variables);

      const value = manager.getValue('categories');
      expect(Array.isArray(value)).toBe(true);
      expect((value as unknown[]).length).toBeGreaterThan(0);
    });
  });
});

describe('Host (TemplateProcessor) identifier filter default value', () => {
  // Host 端 extractVariables 计算的 defaultValue 必须感知 identifier 过滤器，
  // 否则编辑器会直接采用 host 传入的 demo_user，生成器也会把 demo_user 写进演示 SQL。
  it('{{ user | identifier }} 的 defaultValue 为变量名字面量 user，而非 demo_user', () => {
    const processor = TemplateProcessor.getInstance();
    const vars = processor.extractVariables('LEFT JOIN {{ user | identifier }} AS u ON u.id = {{ user_id }}');
    const user = vars.find(v => v.name === 'user');
    expect(user, 'user variable should be extracted').toBeDefined();
    expect(user?.filters).toContain('identifier');
    expect(user?.defaultValue).toBe('user');
    expect(user?.defaultValue).not.toBe('demo_user');
  });

  it('{{ table | sql_identifier }} 的 defaultValue 为 table', () => {
    const processor = TemplateProcessor.getInstance();
    const vars = processor.extractVariables('FROM {{ table | sql_identifier }}');
    const table = vars.find(v => v.name === 'table');
    expect(table?.defaultValue).toBe('table');
  });

  it('点号名 {{ user.id | identifier }} 的 defaultValue 取最后一段 id', () => {
    const processor = TemplateProcessor.getInstance();
    const vars = processor.extractVariables('JOIN {{ user.id | identifier }} AS x');
    const userId = vars.find(v => v.name === 'user.id');
    expect(userId?.defaultValue).toBe('id');
  });

  it('普通字符串变量（无 identifier 过滤器）仍走 demo_<name> 默认', () => {
    const processor = TemplateProcessor.getInstance();
    const vars = processor.extractVariables('SELECT {{ keyword }}');
    const kw = vars.find(v => v.name === 'keyword');
    expect(kw?.defaultValue).toBe('demo_keyword');
  });
});
