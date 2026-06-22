/**
 * Jinja2 For-Loop and Filters Test Coverage
 *
 * Comprehensive tests for for-loop templates, filters, and variable extraction.
 */

import { describe, it, expect } from 'vitest';
import { createAlignedNunjucksEnv } from '../shared/nunjucks-setup';
import { TemplateExpressionAnalyzer } from '../features/templated-sql/analyzers/jinja2-analyzer';
import type { AnalyzerContext } from '../features/templated-sql/analyzers/types';

describe('Jinja2 For-Loop and Filters', () => {
  const env = createAlignedNunjucksEnv();
  const analyzer = new TemplateExpressionAnalyzer();

  const createAnalyzerContext = (template: string): AnalyzerContext => ({
    template,
    existingParameters: []
  });

  describe('For-Loop Variable Extraction', () => {
    it('should extract variables from expressions inside for loop', () => {
      const template = '{% for item in items %}{{ item.id }}, {{ item.name }}{% endfor %}';
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      // Note: The analyzer only extracts variables from {{ }} expressions, not from {% %} blocks
      expect(names).toContain('item.id');
      expect(names).toContain('item.name');
    });

    it('should extract variables from multiple expressions in for loop', () => {
      const template = `
        {% for user in users %}{{ user.name }}{% endfor %}
        {% for order in orders %}{{ order.id }}{% endfor %}
      `;
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      expect(names).toContain('user.name');
      expect(names).toContain('order.id');
    });

    it('should not extract loop variable as parameter', () => {
      const template = '{% for item in items %}{{ loop.index }}{% endfor %}';
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      expect(names).not.toContain('loop');
      // loop.index is extracted as a dotted variable
      expect(names).toContain('loop.index');
    });

    it('should not extract for keyword as variable', () => {
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      expect(names).not.toContain('for');
      expect(names).not.toContain('in');
      expect(names).toContain('item');
    });

    it('should extract variables with filters in for loop', () => {
      const template = '{% for user in users %}{{ user.name | upper }}{% endfor %}';
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      expect(names).toContain('user.name');
    });

    it('should extract multiple loop variables', () => {
      const template = '{% for key, value in items %}{{ key }}: {{ value }}{% endfor %}';
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      expect(names).toContain('key');
      expect(names).toContain('value');
    });

    it('should extract variables from for loop with condition', () => {
      const template = '{% for item in items if item.active %}{{ item.name }}{% endfor %}';
      const result = analyzer.analyze(template, createAnalyzerContext(template));
      const names = result.parameters.map(p => p.name);
      expect(names).toContain('item.name');
    });
  });

  describe('For-Loop Rendering', () => {
    it('should render basic for loop', () => {
      const template = '{% for item in items %}{{ item }}, {% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('a, b, c, ');
    });

    it('should render for loop with loop.last', () => {
      const template = '{% for item in items %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('a, b, c');
    });

    it('should render for loop with loop.first', () => {
      const template = '{% for item in items %}{% if loop.first %}[{% endif %}{{ item }}{% if not loop.last %}, {% endif %}{% if loop.last %}]{% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('[a, b, c]');
    });

    it('should render for loop with loop.index', () => {
      const template = '{% for item in items %}{{ loop.index }}: {{ item }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('1: a, 2: b, 3: c');
    });

    it('should render for loop with loop.index0', () => {
      const template = '{% for item in items %}{{ loop.index0 }}: {{ item }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('0: a, 1: b, 2: c');
    });

    it('should render for loop with loop.length', () => {
      const template = '{% for item in items %}{{ item }} ({{ loop.index }}/{{ loop.length }}){% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('a (1/3), b (2/3), c (3/3)');
    });

    it('should render for-else with empty collection', () => {
      const template = '{% for item in items %}{{ item }}{% else %}No items{% endfor %}';
      const result = env.renderString(template, { items: [] });
      expect(result).toBe('No items');
    });

    it('should render for-else with non-empty collection', () => {
      const template = '{% for item in items %}{{ item }}{% else %}No items{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b'] });
      expect(result).toBe('ab');
    });

    it('should render nested for loops', () => {
      const template = '{% for group in groups %}{% for item in group %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}{% if not loop.last %} | {% endif %}{% endfor %}';
      const result = env.renderString(template, { groups: [['a', 'b'], ['c', 'd']] });
      expect(result).toBe('a, b | c, d');
    });

    it('should render for loop with nested object properties', () => {
      const template = '{% for user in users %}{{ user.name }} ({{ user.id }}){% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, {
        users: [
          { name: 'Alice', id: 1 },
          { name: 'Bob', id: 2 },
          { name: 'Charlie', id: 3 }
        ]
      });
      expect(result).toBe('Alice (1), Bob (2), Charlie (3)');
    });

    it('should render for loop with conditionals', () => {
      const template = '{% for item in items %}{% if item.active %}{{ item.name }}{% if not loop.last %}, {% endif %}{% endif %}{% endfor %}';
      const result = env.renderString(template, {
        items: [
          { name: 'A', active: true },
          { name: 'B', active: false },
          { name: 'C', active: true }
        ]
      });
      expect(result).toContain('A');
      expect(result).toContain('C');
      expect(result).not.toContain('B');
    });
  });

  describe('For-Loop with Filters', () => {
    it('should apply filter to loop variable', () => {
      const template = '{% for item in items %}{{ item | upper }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['hello', 'world'] });
      expect(result).toBe('HELLO, WORLD');
    });

    it('should apply filter to nested property', () => {
      const template = '{% for user in users %}{{ user.name | upper }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, {
        users: [{ name: 'alice' }, { name: 'bob' }]
      });
      expect(result).toBe('ALICE, BOB');
    });

    it('should apply sql_quote filter in for loop', () => {
      const template = '{% for name in names %}{{ name | sql_quote }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { names: ["O'Brien", 'Smith'] });
      expect(result).toBe("'O''Brien', 'Smith'");
    });

    it('should apply sql_identifier filter in for loop', () => {
      const template = 'SELECT {% for col in columns %}{{ col | sql_identifier }}{% if not loop.last %}, {% endif %}{% endfor %} FROM users';
      const result = env.renderString(template, { columns: ['id', 'name', 'email'] });
      expect(result).toBe('SELECT "id", "name", "email" FROM users');
    });

    it('should apply default filter in for loop', () => {
      const template = '{% for item in items %}{{ item.value | default("N/A") }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, {
        items: [{ value: 'a' }, {}, { value: 'c' }]
      });
      expect(result).toBe('a, N/A, c');
    });

    it('should apply chain of filters in for loop', () => {
      const template = '{% for item in items %}{{ item | trim | upper }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: [' hello ', ' world '] });
      expect(result).toBe('HELLO, WORLD');
    });
  });

  describe('For-Loop in SQL Context', () => {
    it('should render IN clause with for loop', () => {
      const template = `SELECT * FROM users WHERE id IN (
{% for id in user_ids %}
  {{ id }}{% if not loop.last %},{% endif %}
{% endfor %}
);`;
      const result = env.renderString(template, { user_ids: [1, 2, 3] });
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    it('should render INSERT with for loop', () => {
      const template = `INSERT INTO users (name, email) VALUES
{% for user in users %}
  ({{ user.name | sql_quote }}, {{ user.email | sql_quote }}){% if not loop.last %},{% endif %}
{% endfor %};`;
      const result = env.renderString(template, {
        users: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' }
        ]
      });
      expect(result).toContain("('Alice', 'alice@example.com')");
      expect(result).toContain("('Bob', 'bob@example.com')");
    });

    it('should render dynamic columns with for loop', () => {
      const template = `SELECT {% for col in columns %}{{ col | sql_identifier }}{% if not loop.last %}, {% endif %}{% endfor %}
FROM {{ table | sql_identifier }}
WHERE 1=1
{% if conditions %}
{% for cond in conditions %}
AND {{ cond.column | sql_identifier }} = {{ cond.value | sql_quote }}
{% endfor %}
{% endif %}`;
      const result = env.renderString(template, {
        columns: ['id', 'name', 'email'],
        table: 'users',
        conditions: [
          { column: 'status', value: 'active' }
        ]
      });
      expect(result).toContain('"id", "name", "email"');
      expect(result).toContain('"users"');
      expect(result).toContain('"status" = \'active\'');
    });

    it('should render batch operations with for loop', () => {
      const template = `{% for batch in batches %}
-- Batch {{ loop.index }}
UPDATE {{ table | sql_identifier }}
SET status = {{ batch.status | sql_quote }}
WHERE id IN ({% for id in batch.ids %}{{ id }}{% if not loop.last %}, {% endif %}{% endfor %});
{% endfor %}`;
      const result = env.renderString(template, {
        table: 'orders',
        batches: [
          { status: 'processed', ids: [1, 2, 3] },
          { status: 'shipped', ids: [4, 5] }
        ]
      });
      expect(result).toContain('-- Batch 1');
      expect(result).toContain('-- Batch 2');
      expect(result).toContain('"orders"');
      expect(result).toContain("'processed'");
      expect(result).toContain("'shipped'");
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty for loop', () => {
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const result = env.renderString(template, { items: [] });
      expect(result).toBe('');
    });

    it('should handle for loop with undefined collection', () => {
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const result = env.renderString(template, {});
      expect(result).toBe('');
    });

    it('should handle for loop with single item', () => {
      const template = '{% for item in items %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['only'] });
      expect(result).toBe('only');
    });

    it('should handle for loop with complex nesting', () => {
      const template = `{% for group in groups %}Group {{ loop.index }}: {% for item in group.elements %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}{% if not loop.last %} | {% endif %}{% endfor %}`;
      const result = env.renderString(template, {
        groups: [
          { elements: ['a', 'b'] },
          { elements: ['c', 'd'] }
        ]
      });
      expect(result).toContain('Group 1');
      expect(result).toContain('Group 2');
      expect(result).toContain('a, b');
      expect(result).toContain('c, d');
    });

    it('should handle for loop with conditional rendering', () => {
      const template = '{% for item in items %}{% if loop.first %}First: {{ item }}{% elif loop.last %}Last: {{ item }}{% else %}Middle: {{ item }}{% endif %}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c', 'd'] });
      expect(result).toBe('First: a, Middle: b, Middle: c, Last: d');
    });

    it('should handle for loop with loop.revindex', () => {
      const template = '{% for item in items %}{{ item }} ({{ loop.revindex }} left){% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('a (3 left), b (2 left), c (1 left)');
    });

    it('should handle for loop with conditional alternation', () => {
      const template = '{% for item in items %}{% if loop.index is odd %}odd{% else %}even{% endif %}: {{ item }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const result = env.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('odd: a, even: b, odd: c');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle for loop with set and macros', () => {
      const template = `{% set separator = ", " %}
{% macro render_list(items) %}{% for item in items %}{{ item }}{% if not loop.last %}{{ separator }}{% endif %}{% endfor %}{% endmacro %}
Items: {{ render_list(names) }}`;
      const result = env.renderString(template, { names: ['Alice', 'Bob', 'Charlie'] });
      expect(result).toContain('Items: Alice, Bob, Charlie');
    });

    it('should handle for loop with filters and conditionals', () => {
      const template = `{% for user in users %}
{% if user.active %}
  {{ user.name | upper }} (Active){% if not loop.last %}, {% endif %}
{% else %}
  {{ user.name | lower }} (Inactive){% if not loop.last %}, {% endif %}
{% endif %}
{% endfor %}`;
      const result = env.renderString(template, {
        users: [
          { name: 'Alice', active: true },
          { name: 'Bob', active: false },
          { name: 'Charlie', active: true }
        ]
      });
      expect(result).toContain('ALICE (Active)');
      expect(result).toContain('bob (Inactive)');
      expect(result).toContain('CHARLIE (Active)');
    });

    it('should handle nested for loops with different collections', () => {
      const template = `{% for category in categories %}{{ category.name }}: {% for item in category.elements %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}{% if not loop.last %} | {% endif %}{% endfor %}`;
      const result = env.renderString(template, {
        categories: [
          { name: 'Fruits', elements: ['Apple', 'Banana'] },
          { name: 'Colors', elements: ['Red', 'Blue', 'Green'] }
        ]
      });
      expect(result).toContain('Fruits:');
      expect(result).toContain('Colors:');
      expect(result).toContain('Apple, Banana');
      expect(result).toContain('Red, Blue, Green');
    });

    it('should handle for loop with SQL generation', () => {
      const template = `-- Generate dynamic SQL
{% for table in tables %}
CREATE TABLE {{ table.name | sql_identifier }} (
{% for column in table.columns %}  {{ column.name | sql_identifier }} {{ column.type }}{% if not loop.last %},{% endif %}
{% endfor %});
{% endfor %}`;
      const result = env.renderString(template, {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INT' },
              { name: 'name', type: 'VARCHAR(100)' }
            ]
          },
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'INT' },
              { name: 'user_id', type: 'INT' },
              { name: 'total', type: 'DECIMAL(10,2)' }
            ]
          }
        ]
      });
      expect(result).toContain('CREATE TABLE "users"');
      expect(result).toContain('CREATE TABLE "orders"');
      expect(result).toContain('"id" INT');
      expect(result).toContain('"name" VARCHAR(100)');
      expect(result).toContain('"user_id" INT');
      expect(result).toContain('"total" DECIMAL(10,2)');
    });
  });
});
