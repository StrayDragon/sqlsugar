/**
 * Parameter Style Analyzers Tests
 *
 * Tests for individual parameter style analyzers.
 */

import { describe, it, expect } from 'vitest';
import { NamedParamAnalyzer } from '../features/templated-sql/analyzers/named-param-analyzer.js';
import { NumericParamAnalyzer } from '../features/templated-sql/analyzers/numeric-param-analyzer.js';
import { PyformatParamAnalyzer } from '../features/templated-sql/analyzers/pyformat-param-analyzer.js';
import { AsyncpgParamAnalyzer } from '../features/templated-sql/analyzers/asyncpg-param-analyzer.js';
import { TemplateExpressionAnalyzer } from '../features/templated-sql/analyzers/jinja2-analyzer.js';
import type { AnalyzerContext } from '../features/templated-sql/analyzers/types.js';

const emptyContext: AnalyzerContext = {
  template: '',
  existingParameters: [],
};

describe('NamedParamAnalyzer', () => {
  const analyzer = new NamedParamAnalyzer();

  it('should extract named parameters', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users WHERE id = :user_id AND name = :name',
      emptyContext
    );

    expect(result.hasResults).toBe(true);
    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('user_id');
    expect(result.parameters[0].type).toBe('named');
    expect(result.parameters[1].name).toBe('name');
  });

  it('should handle parameters at different positions', () => {
    const result = analyzer.analyze(
      'INSERT INTO t (a, b) VALUES (:val1, :val2)',
      emptyContext
    );

    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].startIndex).toBeLessThan(
      result.parameters[1].startIndex
    );
  });

  it('should not match escaped colons (::param)', () => {
    const result = analyzer.analyze(
      'SELECT * FROM t WHERE a = ::escaped',
      emptyContext
    );

    expect(result.parameters).toHaveLength(0);
  });

  it('should not match numeric parameters', () => {
    const result = analyzer.analyze(
      'SELECT * FROM t WHERE a = :1',
      emptyContext
    );

    expect(result.parameters).toHaveLength(0);
  });

  it('should handle underscores in names', () => {
    const result = analyzer.analyze(
      'SELECT :my_long_param_name',
      emptyContext
    );

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe('my_long_param_name');
  });

  it('should handle parameters starting with underscore', () => {
    const result = analyzer.analyze('SELECT :_hidden', emptyContext);

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe('_hidden');
  });

  it('should skip parameters inside Jinja2 expressions', () => {
    const result = analyzer.analyze(
      'SELECT {{ :not_a_param }} FROM t WHERE a = :real_param',
      emptyContext
    );

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe('real_param');
  });

  it('should return empty result when no parameters found', () => {
    const result = analyzer.analyze('SELECT 1', emptyContext);

    expect(result.hasResults).toBe(false);
    expect(result.parameters).toHaveLength(0);
  });

  it('should handle multiple occurrences of same parameter', () => {
    const result = analyzer.analyze(
      'SELECT * FROM t WHERE a = :param OR b = :param',
      emptyContext
    );

    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('param');
    expect(result.parameters[1].name).toBe('param');
  });
});

describe('NumericParamAnalyzer', () => {
  const analyzer = new NumericParamAnalyzer();

  it('should extract numeric parameters', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users WHERE id = :1 AND name = :2',
      emptyContext
    );

    expect(result.hasResults).toBe(true);
    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('1');
    expect(result.parameters[0].position).toBe(0);
    expect(result.parameters[1].name).toBe('2');
    expect(result.parameters[1].position).toBe(1);
  });

  it('should handle larger numbers', () => {
    const result = analyzer.analyze('SELECT :10, :20, :100', emptyContext);

    expect(result.parameters).toHaveLength(3);
    expect(result.parameters[2].name).toBe('100');
  });

  it('should not match named parameters', () => {
    const result = analyzer.analyze(
      'SELECT * FROM t WHERE a = :name',
      emptyContext
    );

    expect(result.parameters).toHaveLength(0);
  });

  it('should not match escaped colons', () => {
    const result = analyzer.analyze('SELECT ::1', emptyContext);

    expect(result.parameters).toHaveLength(0);
  });

  it('should return empty result when no parameters found', () => {
    const result = analyzer.analyze('SELECT 1', emptyContext);

    expect(result.hasResults).toBe(false);
  });
});

describe('PyformatParamAnalyzer', () => {
  const analyzer = new PyformatParamAnalyzer();

  it('should extract pyformat parameters', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users WHERE id = %(user_id)s AND name = %(name)s',
      emptyContext
    );

    expect(result.hasResults).toBe(true);
    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('user_id');
    expect(result.parameters[0].type).toBe('pyformat');
    expect(result.parameters[1].name).toBe('name');
  });

  it('should handle single character names', () => {
    const result = analyzer.analyze('SELECT %(a)s, %(b)s', emptyContext);

    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('a');
  });

  it('should handle underscores in names', () => {
    const result = analyzer.analyze(
      'SELECT %(my_long_name)s',
      emptyContext
    );

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe('my_long_name');
  });

  it('should not match invalid patterns', () => {
    const result = analyzer.analyze(
      'SELECT %s, %(invalid, %(another',
      emptyContext
    );

    expect(result.parameters).toHaveLength(0);
  });

  it('should return empty result when no parameters found', () => {
    const result = analyzer.analyze('SELECT 1', emptyContext);

    expect(result.hasResults).toBe(false);
  });

  it('should track correct positions', () => {
    const sql = 'SELECT %(a)s FROM %(b)s';
    const result = analyzer.analyze(sql, emptyContext);

    expect(result.parameters[0].startIndex).toBe(7);
    expect(result.parameters[0].endIndex).toBe(12);
    expect(result.parameters[1].startIndex).toBe(18);
    expect(result.parameters[1].endIndex).toBe(23);
  });
});

describe('AsyncpgParamAnalyzer', () => {
  const analyzer = new AsyncpgParamAnalyzer();

  it('should extract asyncpg parameters', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users WHERE id = $1 AND name = $2',
      emptyContext
    );

    expect(result.hasResults).toBe(true);
    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('1');
    expect(result.parameters[0].position).toBe(0);
    expect(result.parameters[0].type).toBe('asyncpg');
    expect(result.parameters[1].name).toBe('2');
    expect(result.parameters[1].position).toBe(1);
  });

  it('should handle larger numbers', () => {
    const result = analyzer.analyze('SELECT $10, $20, $100', emptyContext);

    expect(result.parameters).toHaveLength(3);
    expect(result.parameters[2].name).toBe('100');
  });

  it('should not match dollar signs without numbers', () => {
    const result = analyzer.analyze(
      'SELECT $price, $amount',
      emptyContext
    );

    expect(result.parameters).toHaveLength(0);
  });

  it('should handle out-of-order parameters', () => {
    const result = analyzer.analyze(
      'UPDATE tbl SET info=$2 WHERE id=$1',
      emptyContext
    );

    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('2');
    expect(result.parameters[1].name).toBe('1');
  });

  it('should return empty result when no parameters found', () => {
    const result = analyzer.analyze('SELECT 1', emptyContext);

    expect(result.hasResults).toBe(false);
  });

  it('should track correct positions', () => {
    const sql = 'SELECT $1, $2';
    const result = analyzer.analyze(sql, emptyContext);

    expect(result.parameters[0].startIndex).toBe(7);
    expect(result.parameters[0].endIndex).toBe(9);
    expect(result.parameters[1].startIndex).toBe(11);
    expect(result.parameters[1].endIndex).toBe(13);
  });
});

describe('TemplateExpressionAnalyzer', () => {
  const analyzer = new TemplateExpressionAnalyzer();

  it('should extract Jinja2 variables', () => {
    const result = analyzer.analyze(
      'SELECT * FROM {{ table_name }} WHERE id = {{ user_id }}',
      emptyContext
    );

    expect(result.hasResults).toBe(true);
    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('table_name');
    expect(result.parameters[0].type).toBe('jinja2');
    expect(result.parameters[1].name).toBe('user_id');
  });

  it('should extract variables from conditions', () => {
    const result = analyzer.analyze(
      '{% if show_active %}SELECT * FROM users{% endif %}',
      emptyContext
    );

    // Note: TemplateExpressionAnalyzer focuses on {{ }} expressions

    expect(result.hasResults).toBe(false);
  });

  it('should handle filters', () => {
    const result = analyzer.analyze(
      'SELECT {{ name | upper }}',
      emptyContext
    );

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe('name');
  });

  it('should skip keywords', () => {
    const result = analyzer.analyze(
      '{{ true }} {{ none }}',
      emptyContext
    );

    expect(result.parameters).toHaveLength(0);
  });

  it('should handle dotted names', () => {
    const result = analyzer.analyze(
      'SELECT {{ user.name }} FROM {{ users }}',
      emptyContext
    );

    expect(result.parameters).toHaveLength(2);
    expect(result.parameters[0].name).toBe('user.name');
    expect(result.parameters[1].name).toBe('users');
  });

  it('should deduplicate variables', () => {
    const result = analyzer.analyze(
      'SELECT {{ name }}, {{ name }}',
      emptyContext
    );

    expect(result.parameters).toHaveLength(1);
  });

  it('should return empty result when no Jinja2 expressions found', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users WHERE id = :id',
      emptyContext
    );

    expect(result.hasResults).toBe(false);
  });
});

describe('Analyzer priority ordering', () => {
  it('jinja2 should have highest priority (lowest number)', () => {
    const jinja2 = new TemplateExpressionAnalyzer();
    const named = new NamedParamAnalyzer();
    const numeric = new NumericParamAnalyzer();
    const pyformat = new PyformatParamAnalyzer();
    const asyncpg = new AsyncpgParamAnalyzer();

    expect(jinja2.priority).toBeLessThan(named.priority);
    expect(named.priority).toBeLessThan(numeric.priority);
    expect(numeric.priority).toBeLessThan(pyformat.priority);
    expect(pyformat.priority).toBeLessThan(asyncpg.priority);
  });
});
