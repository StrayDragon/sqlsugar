import { describe, it, expect } from 'vitest';
import { TemplateProcessor } from '../features/templated-sql/processor';

describe('TemplateProcessor', () => {
  const processor = TemplateProcessor.getInstance();

  describe('renderTemplate', () => {
    it('should render simple variable substitution', () => {
      const result = processor.renderTemplate(
        'SELECT * FROM {{ table_name }}',
        { table_name: 'users' }
      );
      expect(result).toBe('SELECT * FROM users');
    });

    it('should render multiple variables', () => {
      const result = processor.renderTemplate(
        'SELECT * FROM {{ table }} WHERE id = {{ id }}',
        { table: 'users', id: '42' }
      );
      expect(result).toBe('SELECT * FROM users WHERE id = 42');
    });

    it('should handle nested variables with dot notation', () => {
      const result = processor.renderTemplate(
        'SELECT * FROM users WHERE id = {{ user.id }}',
        { 'user.id': '123' }
      );
      expect(result).toBe('SELECT * FROM users WHERE id = 123');
    });

    it('should handle conditionals', () => {
      const result = processor.renderTemplate(
        'SELECT * FROM users{% if is_active %} WHERE active = true{% endif %}',
        { is_active: true }
      );
      expect(result).toContain('WHERE active = true');
    });

    it('should handle falsy conditionals', () => {
      const result = processor.renderTemplate(
        'SELECT * FROM users{% if is_active %} WHERE active = true{% endif %}',
        { is_active: false }
      );
      expect(result).not.toContain('WHERE active = true');
    });

    it('should handle for loops', () => {
      const result = processor.renderTemplate(
        '{% for col in columns %}{{ col }},{% endfor %}',
        { columns: ['id', 'name', 'email'] }
      );
      expect(result).toBe('id,name,email,');
    });

    it('should handle sql_quote filter', () => {
      const result = processor.renderTemplate(
        "WHERE name = {{ name|sql_quote }}",
        { name: "O'Brien" }
      );
      expect(result).toContain("'O''Brien'");
    });

    it('should handle undefined variables gracefully', () => {
      const result = processor.renderTemplate(
        'Hello {{ missing_var }}!',
        {}
      );
      expect(result).toBe('Hello !');
    });

    it('should handle sql_identifier filter', () => {
      const result = processor.renderTemplate(
        'SELECT * FROM {{ table|sql_identifier }}',
        { table: 'user_data' }
      );
      expect(result).toContain('"user_data"');
    });
  });

  describe('extractVariables', () => {
    it('should extract from conditional expressions', () => {
      const template = `
        SELECT * FROM users
        {% if include_email %}
        , email
        {% endif %}
        WHERE status = {{ status }}
      `;
      const variables = processor.extractVariables(template);
      const names = variables.map(v => v.name);
      expect(names).toContain('include_email');
      expect(names).toContain('status');
    });

    it('should extract from for loops', () => {
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const variables = processor.extractVariables(template);
      const names = variables.map(v => v.name);
      expect(names).toContain('items');
    });

    it('should extract dotted variable names', () => {
      const template = 'SELECT {{ user.name }} FROM {{ user.table }}';
      const variables = processor.extractVariables(template);
      const names = variables.map(v => v.name);
      expect(names.some(n => n.includes('user'))).toBe(true);
    });

    it('should extract variables with filters', () => {
      const template = "{{ name|sql_quote }} AND {{ date|sql_date('%Y-%m-%d') }}";
      const variables = processor.extractVariables(template);
      expect(variables.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty template', () => {
      const variables = processor.extractVariables('SELECT 1');
      expect(variables).toHaveLength(0);
    });

    it('should deduplicate variables', () => {
      const template = '{{ name }} AND {{ name }} AND {{ name }}';
      const variables = processor.extractVariables(template);
      const nameCount = variables.filter(v => v.name === 'name').length;
      expect(nameCount).toBe(1);
    });
  });

  describe('Type inference edge cases', () => {
    it('should infer email type from email-related names', () => {
      const vars = processor.extractVariables('{{ email_address }}');
      const emailVar = vars.find(v => v.name === 'email_address');
      expect(emailVar?.type).toBe('string');
      expect(emailVar?.defaultValue).toMatch(/@/);
    });

    it('should infer date type with appropriate default', () => {
      const vars = processor.extractVariables('{{ created_at }}');
      const dateVar = vars.find(v => v.name === 'created_at');
      expect(dateVar?.type).toBe('date');
    });

    it('should handle complex template without errors', () => {
      const complexTemplate = `
        SELECT u.id, u.name, o.total
        FROM users u
        JOIN orders o ON o.user_id = u.id
        WHERE 1=1
        {% if min_total %}AND o.total >= {{ min_total }}{% endif %}
        {% if status_list %}AND u.status IN ({{ status_list|sql_in }}){% endif %}
        {% if start_date %}AND o.created_at >= {{ start_date|sql_date('%Y-%m-%d') }}{% endif %}
        ORDER BY {{ order_by|default('o.created_at') }} {{ direction|default('DESC') }}
        LIMIT {{ page_size|default(20) }}
        OFFSET {{ offset|default(0) }}
      `;
      const variables = processor.extractVariables(complexTemplate);
      expect(variables.length).toBeGreaterThan(0);

      const rendered = processor.renderTemplate(complexTemplate, {
        min_total: '100',
        status_list: ['active', 'pending'],
        start_date: '2024-01-01',
        order_by: 'o.total',
        direction: 'ASC',
        page_size: '10',
        offset: '0',
      });
      expect(rendered).toContain('SELECT u.id');
      expect(rendered).toContain('o.total >= 100');
    });
  });
});
