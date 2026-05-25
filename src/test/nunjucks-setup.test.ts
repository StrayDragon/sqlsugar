import { describe, it, expect } from 'vitest';
import { createAlignedNunjucksEnv, buildNestedContext } from '../shared/nunjucks-setup';

describe('nunjucks-setup', () => {
  const env = createAlignedNunjucksEnv();

  describe('Jinja2 test expressions', () => {
    it('divisibleby', () => {
      expect(env.renderString('{% if 12 is divisibleby(3) %}yes{% endif %}', {})).toBe('yes');
      expect(env.renderString('{% if 7 is divisibleby(3) %}yes{% else %}no{% endif %}', {})).toBe('no');
    });

    it('even / odd', () => {
      expect(env.renderString('{% if 4 is even %}yes{% endif %}', {})).toBe('yes');
      expect(env.renderString('{% if 3 is odd %}yes{% endif %}', {})).toBe('yes');
      expect(env.renderString('{% if 3 is even %}yes{% else %}no{% endif %}', {})).toBe('no');
    });

    it('number / integer / float', () => {
      expect(env.renderString('{% if val is number %}yes{% endif %}', { val: 42 })).toBe('yes');
      expect(env.renderString('{% if val is number %}yes{% else %}no{% endif %}', { val: 'abc' })).toBe('no');
      expect(env.renderString('{% if val is integer %}yes{% endif %}', { val: 42 })).toBe('yes');
      expect(env.renderString('{% if val is float %}yes{% endif %}', { val: 3.14 })).toBe('yes');
    });

    it('string', () => {
      expect(env.renderString('{% if val is string %}yes{% endif %}', { val: 'hello' })).toBe('yes');
      expect(env.renderString('{% if val is string %}yes{% else %}no{% endif %}', { val: 42 })).toBe('no');
    });

    it('none', () => {
      expect(env.renderString('{% if val is none %}yes{% endif %}', { val: null })).toBe('yes');
      expect(env.renderString('{% if val is none %}yes{% else %}no{% endif %}', { val: 'x' })).toBe('no');
    });

    it('boolean', () => {
      expect(env.renderString('{% if val is boolean %}yes{% endif %}', { val: true })).toBe('yes');
      expect(env.renderString('{% if val is boolean %}yes{% else %}no{% endif %}', { val: 1 })).toBe('no');
    });

    it('sameas', () => {
      expect(env.renderString('{% if a is sameas(b) %}yes{% endif %}', { a: 1, b: 1 })).toBe('yes');
    });

    it('sequence / mapping / iterable', () => {
      expect(env.renderString('{% if val is sequence %}yes{% endif %}', { val: [1, 2] })).toBe('yes');
      expect(env.renderString('{% if val is mapping %}yes{% endif %}', { val: { a: 1 } })).toBe('yes');
      expect(env.renderString('{% if val is iterable %}yes{% endif %}', { val: [1] })).toBe('yes');
      expect(env.renderString('{% if val is iterable %}yes{% endif %}', { val: 'abc' })).toBe('yes');
    });

    it('lower / upper', () => {
      expect(env.renderString('{% if val is lower %}yes{% endif %}', { val: 'abc' })).toBe('yes');
      expect(env.renderString('{% if val is upper %}yes{% endif %}', { val: 'ABC' })).toBe('yes');
      expect(env.renderString('{% if val is lower %}yes{% else %}no{% endif %}', { val: 'Abc' })).toBe('no');
    });
  });

  describe('sql_date format compatibility', () => {
    const testDate = new Date('2024-03-15T10:30:45Z');

    it('supports YYYY-MM-DD token format', () => {
      const result = env.renderString('{{ d | sql_date("YYYY-MM-DD") }}', { d: testDate });
      expect(result).toBe('2024-03-15');
    });

    it('supports strftime %Y-%m-%d token format', () => {
      const result = env.renderString('{{ d | sql_date("%Y-%m-%d") }}', { d: testDate });
      expect(result).toBe('2024-03-15');
    });

    it('uses YYYY-MM-DD as default format', () => {
      const result = env.renderString('{{ d | sql_date }}', { d: testDate });
      expect(result).toBe('2024-03-15');
    });
  });

  describe('round filter with method parameter', () => {
    it('rounds with common method (default)', () => {
      expect(env.renderString('{{ 2.5 | round }}', {})).toBe('3');
      expect(env.renderString('{{ 2.4 | round }}', {})).toBe('2');
    });

    it('rounds with precision', () => {
      expect(env.renderString('{{ 3.14159 | round(2) }}', {})).toBe('3.14');
    });

    it('rounds with ceil method', () => {
      expect(env.renderString('{{ 2.1 | round(0, "ceil") }}', {})).toBe('3');
    });

    it('rounds with floor method', () => {
      expect(env.renderString('{{ 2.9 | round(0, "floor") }}', {})).toBe('2');
    });

    it('ceil/floor with precision', () => {
      expect(env.renderString('{{ 2.123 | round(2, "ceil") }}', {})).toBe('2.13');
      expect(env.renderString('{{ 2.129 | round(2, "floor") }}', {})).toBe('2.12');
    });
  });

  describe('SQL filters', () => {
    it('sql_quote escapes single quotes', () => {
      expect(env.renderString("{{ val | sql_quote }}", { val: "O'Brien" })).toBe("'O''Brien'");
    });

    it('sql_quote handles null', () => {
      expect(env.renderString("{{ val | sql_quote }}", { val: null })).toBe('null');
    });

    it('sql_identifier wraps in double quotes', () => {
      expect(env.renderString('{{ val | sql_identifier }}', { val: 'table_name' })).toBe('"table_name"');
    });

    it('sql_in formats array for IN clause', () => {
      const result = env.renderString('{{ vals | sql_in }}', { vals: ['a', 'b', 'c'] });
      expect(result).toBe("'a', 'b', 'c'");
    });

    it('sql_in handles null in array', () => {
      const result = env.renderString('{{ vals | sql_in }}', { vals: ['a', null, 'c'] });
      expect(result).toBe("'a', null, 'c'");
    });
  });

  describe('type coercion filters', () => {
    it('float converts to float string', () => {
      expect(env.renderString('{{ "3.14" | float }}', {})).toBe('3.14');
      expect(env.renderString('{{ val | float }}', { val: null })).toBe('NaN');
    });

    it('int converts to integer string', () => {
      expect(env.renderString('{{ "42" | int }}', {})).toBe('42');
      expect(env.renderString('{{ "3.7" | int }}', {})).toBe('3');
    });

    it('bool converts truthy/falsy values', () => {
      expect(env.renderString('{% if "true" | bool %}yes{% endif %}', {})).toBe('yes');
      expect(env.renderString('{% if "false" | bool %}yes{% else %}no{% endif %}', {})).toBe('no');
    });

    it('default provides fallback for undefined', () => {
      expect(env.renderString('{{ val | default("fallback") }}', {})).toBe('fallback');
      expect(env.renderString('{{ val | default("fallback") }}', { val: 'actual' })).toBe('actual');
    });
  });

  describe('collection filters', () => {
    it('unique removes duplicates', () => {
      const result = env.renderString('{{ vals | unique | join(", ") }}', { vals: [1, 2, 2, 3] });
      expect(result).toBe('1, 2, 3');
    });

    it('first / last', () => {
      expect(env.renderString('{{ vals | first }}', { vals: [10, 20, 30] })).toBe('10');
      expect(env.renderString('{{ vals | last }}', { vals: [10, 20, 30] })).toBe('30');
    });

    it('sum with and without attribute', () => {
      expect(env.renderString('{{ vals | sum }}', { vals: [1, 2, 3] })).toBe('6');
    });

    it('tojson serializes to JSON', () => {
      expect(env.renderString('{{ val | tojson }}', { val: { a: 1 } })).toBe('{"a":1}');
    });
  });

  describe('buildNestedContext', () => {
    it('nests dot-separated keys', () => {
      const result = buildNestedContext({ 'user.name': 'Alice', 'user.id': 1 });
      expect(result).toEqual({ user: { name: 'Alice', id: 1 } });
    });

    it('preserves simple keys', () => {
      const result = buildNestedContext({ simple: 'value', 'a.b': 1 });
      expect(result).toEqual({ simple: 'value', a: { b: 1 } });
    });

    it('handles deeply nested keys', () => {
      const result = buildNestedContext({ 'a.b.c': 'deep' });
      expect(result).toEqual({ a: { b: { c: 'deep' } } });
    });

    it('returns empty object for empty input', () => {
      expect(buildNestedContext({})).toEqual({});
    });
  });

  describe('custom globals', () => {
    it('now() returns a date-like value', () => {
      const result = env.renderString('{{ now() }}', {});
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('uuid() generates a UUID-like string', () => {
      const result = env.renderString('{{ uuid() }}', {});
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('complex SQL template scenarios', () => {
    it('renders template with conditionals and filters', () => {
      const template = `SELECT * FROM users WHERE 1=1
{% if name %}AND name = {{ name | sql_quote }}{% endif %}
{% if ids %}AND id IN ({{ ids | sql_in }}){% endif %}`;

      const result = env.renderString(template, buildNestedContext({
        name: "O'Brien",
        ids: ['a', 'b'],
      }));

      expect(result).toContain("name = 'O''Brien'");
      expect(result).toContain("id IN ('a', 'b')");
    });

    it('renders template with test expressions in SQL context', () => {
      const template = `SELECT
{% if limit is number %}LIMIT {{ limit }}{% endif %}
{% if page is integer %}OFFSET {{ (page - 1) * 10 }}{% endif %}`;

      const result = env.renderString(template, { limit: 100, page: 3 });
      expect(result).toContain('LIMIT 100');
      expect(result).toContain('OFFSET 20');
    });

    it('handles for loop with conditionals', () => {
      const template = `{% for col in columns %}{{ col }}{% if not loop.last %}, {% endif %}{% endfor %}`;
      const result = env.renderString(template, { columns: ['id', 'name', 'email'] });
      expect(result).toBe('id, name, email');
    });
  });

  describe('example template: 01-jinja2-example', () => {
    it('renders basic variable substitution with conditionals', () => {
      const template = `SELECT * FROM users
WHERE name = '{{ user_name }}'
  AND age > {{ user_age }}
  AND is_active = {{ is_active }}
  {% if show_created %}AND created_at > '{{ start_date }}'{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit_value }};`;

      const result = env.renderString(template, {
        user_name: 'Alice',
        user_age: 25,
        is_active: true,
        show_created: true,
        start_date: '2024-01-01',
        limit_value: 10,
      });
      expect(result).toContain("name = 'Alice'");
      expect(result).toContain('age > 25');
      expect(result).toContain("created_at > '2024-01-01'");
      expect(result).toContain('LIMIT 10');
    });

    it('omits conditional block when flag is false', () => {
      const template = `{% if show_created %}AND created_at > '{{ start_date }}'{% endif %}`;
      const result = env.renderString(template, { show_created: false });
      expect(result.trim()).toBe('');
    });
  });

  describe('example template: 02-filters-and-tests', () => {
    it('renders Jinja compat string filters (upper/lower/title/trim)', () => {
      const template = `'{{ user_name | upper }}' '{{ user_name | lower }}' '{{ user_name | title }}'`;
      const result = env.renderString(template, { user_name: 'alice doe' });
      expect(result).toContain("'ALICE DOE'");
      expect(result).toContain("'alice doe'");
      expect(result).toContain("'Alice Doe'");
    });

    it('renders default filter with and without boolean mode', () => {
      const result1 = env.renderString('{{ price | default(0) }}', {});
      expect(result1).toBe('0');
      const result2 = env.renderString('{{ quantity | default(1, true) }}', { quantity: 0 });
      expect(result2).toBe('1');
      const result3 = env.renderString('{{ quantity | default(1, true) }}', { quantity: 5 });
      expect(result3).toBe('5');
    });

    it('renders replace filter', () => {
      const result = env.renderString("{{ keyword | replace(' ', '%') }}", { keyword: 'hello world' });
      expect(result).toBe('hello%world');
    });

    it('renders join filter for IN clause', () => {
      const result = env.renderString("{{ user_ids | join(', ') }}", { user_ids: [1, 2, 3] });
      expect(result).toBe('1, 2, 3');
    });
  });

  describe('example template: 03-loops-and-conditionals', () => {
    it('renders for loop with loop.first / loop.last', () => {
      const template = `{% for status in order_statuses %}{% if loop.first %}({% endif %}'{{ status }}'{% if not loop.last %},{% endif %}{% if loop.last %}){% endif %}{% endfor %}`;
      const result = env.renderString(template, { order_statuses: ['active', 'pending', 'done'] });
      expect(result).toBe("('active','pending','done')");
    });

    it('renders nested conditionals in loop', () => {
      const template = `{% for item in items %}{% if item.active %}{{ item.name }}{% endif %}{% endfor %}`;
      const result = env.renderString(template, {
        items: [{ name: 'A', active: true }, { name: 'B', active: false }, { name: 'C', active: true }],
      });
      expect(result).toBe('AC');
    });

    it('renders for-else when collection is empty', () => {
      const template = `{% for id in ids %}{{ id }}{% else %}EMPTY{% endfor %}`;
      const result = env.renderString(template, { ids: [] });
      expect(result).toBe('EMPTY');
    });
  });

  describe('example template: 06-advanced-tests', () => {
    it('renders divisibleby test in SQL context', () => {
      const template = `{% if batch_size is divisibleby(10) %}Large{% elif batch_size is divisibleby(5) %}Medium{% else %}Small{% endif %}`;
      expect(env.renderString(template, { batch_size: 100 })).toBe('Large');
      expect(env.renderString(template, { batch_size: 15 })).toBe('Medium');
      expect(env.renderString(template, { batch_size: 7 })).toBe('Small');
    });

    it('renders number test for type checking', () => {
      const template = `{% if age is defined %}{% if age is number %}age = {{ age }}{% endif %}{% endif %}`;
      expect(env.renderString(template, { age: 25 })).toContain('age = 25');
      expect(env.renderString(template, { age: 'not_a_number' })).toBe('');
    });

    it('renders sameas test for identity check', () => {
      const template = `{% if is_active is sameas(true) %}active{% elif is_active is sameas(false) %}inactive{% endif %}`;
      expect(env.renderString(template, { is_active: true })).toBe('active');
      expect(env.renderString(template, { is_active: false })).toBe('inactive');
    });

    it('renders defined/none tests for conditional filtering', () => {
      const template = `{% if val is defined and val is not none %}{{ val }}{% else %}NULL{% endif %}`;
      expect(env.renderString(template, { val: 'hello' })).toBe('hello');
      expect(env.renderString(template, { val: null })).toBe('NULL');
      expect(env.renderString(template, {})).toBe('NULL');
    });
  });

  describe('example template: 10-comprehensive (macros + set + complex)', () => {
    it('renders macros with parameters', () => {
      const template = `{% macro greet(name) %}Hello {{ name }}{% endmacro %}{{ greet('World') }}`;
      expect(env.renderString(template, {})).toBe('Hello World');
    });

    it('renders set variables used in later expressions', () => {
      const template = `{% set page_size = 20 %}{% set page = 3 %}LIMIT {{ page_size }} OFFSET {{ (page - 1) * page_size }}`;
      const result = env.renderString(template, {});
      expect(result).toContain('LIMIT 20');
      expect(result).toContain('OFFSET 40');
    });

    it('renders macro with conditional and loop', () => {
      const template = `{% macro format_list(items) %}{% for item in items %}'{{ item }}'{% if not loop.last %}, {% endif %}{% endfor %}{% endmacro %}{{ format_list(names) }}`;
      const result = env.renderString(template, { names: ['a', 'b', 'c'] });
      expect(result).toBe("'a', 'b', 'c'");
    });

    it('renders whitespace-controlled macro', () => {
      const template = `{% macro ws() -%}no_ws{%- endmacro %}[{{ ws() }}]`;
      const result = env.renderString(template, {});
      expect(result).toBe('[no_ws]');
    });
  });
});
