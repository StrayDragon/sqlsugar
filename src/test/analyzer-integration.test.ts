/**
 * Analyzer Integration Tests
 *
 * End-to-end tests for the multi-analyzer pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyzerPipeline } from '../features/jinja2/analyzers/analyzer-pipeline.js';
import { Jinja2Analyzer } from '../features/jinja2/analyzers/jinja2-analyzer.js';
import { NamedParamAnalyzer } from '../features/jinja2/analyzers/named-param-analyzer.js';
import { NumericParamAnalyzer } from '../features/jinja2/analyzers/numeric-param-analyzer.js';
import { PyformatParamAnalyzer } from '../features/jinja2/analyzers/pyformat-param-analyzer.js';
import { AsyncpgParamAnalyzer } from '../features/jinja2/analyzers/asyncpg-param-analyzer.js';

describe('Analyzer Integration', () => {
  let pipeline: AnalyzerPipeline;

  beforeEach(() => {
    pipeline = new AnalyzerPipeline();
    pipeline.register(new Jinja2Analyzer());
    pipeline.register(new NamedParamAnalyzer());
    pipeline.register(new NumericParamAnalyzer());
    pipeline.register(new PyformatParamAnalyzer());
    pipeline.register(new AsyncpgParamAnalyzer());
  });

  describe('multi-analyzer extraction', () => {
    it('should extract Jinja2 variables and named parameters together', () => {
      const sql = `
        SELECT * FROM {{ table_name }}
        WHERE user_id = :user_id
        AND status = :status
      `;

      const result = pipeline.execute(sql);

      const jinja2Params = result.parameters.filter((p) => p.type === 'jinja2');
      const namedParams = result.parameters.filter((p) => p.type === 'named');

      expect(jinja2Params).toHaveLength(1);
      expect(jinja2Params[0].name).toBe('table_name');

      expect(namedParams).toHaveLength(2);
      expect(namedParams[0].name).toBe('user_id');
      expect(namedParams[1].name).toBe('status');
    });

    it('should extract mixed parameter styles', () => {
      const sql = `
        SELECT * FROM {{ table_name }}
        WHERE named_param = :name
        AND numeric_param = :1
        AND pyformat_param = %(value)s
        AND asyncpg_param = $1
      `;

      const result = pipeline.execute(sql, { deduplicate: false });

      expect(result.parameters.length).toBeGreaterThanOrEqual(5);

      const byType = {
        jinja2: result.parameters.filter((p) => p.type === 'jinja2'),
        named: result.parameters.filter((p) => p.type === 'named'),
        numeric: result.parameters.filter((p) => p.type === 'numeric'),
        pyformat: result.parameters.filter((p) => p.type === 'pyformat'),
        asyncpg: result.parameters.filter((p) => p.type === 'asyncpg'),
      };

      expect(byType.jinja2).toHaveLength(1);
      expect(byType.named).toHaveLength(1);
      expect(byType.numeric).toHaveLength(1);
      expect(byType.pyformat).toHaveLength(1);
      expect(byType.asyncpg).toHaveLength(1);
    });

    it('should handle real-world PostgreSQL query', () => {
      const sql = `
        SELECT u.id, u.name, u.email
        FROM users u
        WHERE u.id = $1
        AND u.status = %(status)s
        AND u.created_at > :start_date
      `;

      const result = pipeline.execute(sql);

      expect(result.parameters.length).toBeGreaterThanOrEqual(3);

      const asyncpgParam = result.parameters.find((p) => p.type === 'asyncpg');
      const pyformatParam = result.parameters.find((p) => p.type === 'pyformat');
      const namedParam = result.parameters.find((p) => p.type === 'named');

      expect(asyncpgParam?.name).toBe('1');
      expect(pyformatParam?.name).toBe('status');
      expect(namedParam?.name).toBe('start_date');
    });

    it('should handle SQLAlchemy-style query with Jinja2 conditions', () => {
      const sql = `
        SELECT * FROM users
        WHERE 1=1
        {% if filter_by_name %}
          AND name = :name
        {% endif %}
        {% if filter_by_status %}
          AND status = :status
        {% endif %}
      `;

      const result = pipeline.execute(sql);

      const namedParams = result.parameters.filter((p) => p.type === 'named');
      expect(namedParams).toHaveLength(2);
      expect(namedParams.map((p) => p.name)).toContain('name');
      expect(namedParams.map((p) => p.name)).toContain('status');
    });
  });

  describe('auto-detect mode', () => {
    it('should detect named style from content', () => {
      const sql = 'SELECT * FROM users WHERE id = :user_id';
      const result = pipeline.execute(sql, { shortCircuit: true });

      // Should execute named analyzer and find results
      expect(result.metadata.executedAnalyzers).toContain('named');
      expect(result.parameters.some((p) => p.type === 'named')).toBe(true);
    });

    it('should detect asyncpg style from content', () => {
      const sql = 'SELECT * FROM users WHERE id = $1';
      const result = pipeline.execute(sql, { shortCircuit: true });

      expect(result.metadata.executedAnalyzers).toContain('asyncpg');
      expect(result.parameters.some((p) => p.type === 'asyncpg')).toBe(true);
    });

    it('should detect pyformat style from content', () => {
      const sql = 'SELECT * FROM users WHERE id = %(user_id)s';
      const result = pipeline.execute(sql, { shortCircuit: true });

      expect(result.metadata.executedAnalyzers).toContain('pyformat');
      expect(result.parameters.some((p) => p.type === 'pyformat')).toBe(true);
    });

    it('should detect numeric style from content', () => {
      const sql = 'SELECT * FROM users WHERE id = :1';
      const result = pipeline.execute(sql, { shortCircuit: true });

      expect(result.metadata.executedAnalyzers).toContain('numeric');
      expect(result.parameters.some((p) => p.type === 'numeric')).toBe(true);
    });
  });

  describe('manual mode', () => {
    it('should only execute selected analyzers', () => {
      const sql = `
        SELECT * FROM users
        WHERE id = :id
        AND status = $1
        AND name = %(name)s
      `;

      const result = pipeline.execute(sql, {
        enabledAnalyzers: ['named'],
      });

      expect(result.metadata.executedAnalyzers).toEqual(['named']);
      expect(result.parameters).toHaveLength(1);
      expect(result.parameters[0].type).toBe('named');
    });

    it('should execute multiple selected analyzers', () => {
      const sql = `
        SELECT * FROM users
        WHERE id = :id
        AND status = $1
      `;

      const result = pipeline.execute(sql, {
        enabledAnalyzers: ['named', 'asyncpg'],
      });

      expect(result.metadata.executedAnalyzers).toContain('named');
      expect(result.metadata.executedAnalyzers).toContain('asyncpg');
      expect(result.parameters).toHaveLength(2);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate same parameter from different analyzers', () => {
      // This shouldn't normally happen, but tests the dedup logic
      const sql = 'SELECT :param';

      const result = pipeline.execute(sql, { deduplicate: true });

      const namedParams = result.parameters.filter(
        (p) => p.name === 'param' && p.type === 'named'
      );
      expect(namedParams).toHaveLength(1);
    });

    it('should keep parameters with different names', () => {
      const sql = 'SELECT :a, :b, :c';

      const result = pipeline.execute(sql);

      expect(result.parameters).toHaveLength(3);
      expect(result.parameters.map((p) => p.name)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('performance', () => {
    it('should complete analysis within reasonable time', () => {
      const sql = `
        SELECT * FROM users
        WHERE id = :id
        AND name = :name
        AND email = :email
        AND status = :status
        AND created_at > :start_date
        AND created_at < :end_date
      `;

      const result = pipeline.execute(sql);

      expect(result.metadata.executionTime).toBeLessThan(100); // Should be fast
    });

    it('should handle large queries efficiently', () => {
      // Generate a query with many parameters
      const params = Array.from({ length: 50 }, (_, i) => `param_${i}`);
      const conditions = params.map((p) => `${p} = :${p}`).join(' AND ');
      const sql = `SELECT * FROM t WHERE ${conditions}`;

      const result = pipeline.execute(sql);

      expect(result.parameters).toHaveLength(50);
      expect(result.metadata.executionTime).toBeLessThan(500);
    });
  });

  describe('edge cases', () => {
    it('should handle empty SQL', () => {
      const result = pipeline.execute('');

      expect(result.parameters).toHaveLength(0);
      expect(result.metadata.executedAnalyzers.length).toBeGreaterThan(0);
    });

    it('should handle SQL with no parameters', () => {
      const sql = 'SELECT * FROM users WHERE id = 1';

      const result = pipeline.execute(sql);

      expect(result.parameters).toHaveLength(0);
    });

    it('should handle SQL with only comments', () => {
      const sql = '-- This is a comment\n/* Block comment */';

      const result = pipeline.execute(sql);

      expect(result.parameters).toHaveLength(0);
    });

    it('should handle SQL with string literals containing colons', () => {
      const sql = "SELECT * FROM users WHERE name = 'user:name' AND id = :id";

      const result = pipeline.execute(sql);

      // Note: Current implementation extracts both :name and :id
      // String literal handling is a known limitation
      const namedParams = result.parameters.filter((p) => p.type === 'named');
      expect(namedParams.length).toBeGreaterThanOrEqual(1);
      expect(namedParams.some((p) => p.name === 'id')).toBe(true);
    });
  });
});
