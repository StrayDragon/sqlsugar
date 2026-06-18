/**
 * Analyzer Pipeline Tests
 *
 * Tests for the multi-pass analyzer pipeline architecture.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyzerPipeline } from '../features/templated-sql/analyzers/analyzer-pipeline.js';
import type {
  Analyzer,
  AnalyzerContext,
  AnalyzerResult,
  ExtractedParameter,
} from '../features/templated-sql/analyzers/types.js';

/**
 * Mock analyzer for testing
 */
function createMockAnalyzer(
  name: string,
  priority: number,
  results: ExtractedParameter[] = []
): Analyzer {
  return {
    name,
    priority,
    displayName: `Mock ${name}`,
    paramStyle: 'named',
    analyze(_sql: string, _context: AnalyzerContext): AnalyzerResult {
      return {
        parameters: results,
        metadata: {},
        hasResults: results.length > 0,
      };
    },
  };
}

/**
 * Mock analyzer that returns parameters based on a pattern
 */
function createPatternAnalyzer(
  name: string,
  priority: number,
  pattern: RegExp,
  type: ExtractedParameter['type']
): Analyzer {
  return {
    name,
    priority,
    displayName: `Pattern ${name}`,
    paramStyle: type,
    analyze(sql: string, _context: AnalyzerContext): AnalyzerResult {
      const parameters: ExtractedParameter[] = [];
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(sql)) !== null) {
        parameters.push({
          name: match[1] || match[0],
          position: parameters.length,
          type,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          originalText: match[0],
        });
      }

      return {
        parameters,
        metadata: {},
        hasResults: parameters.length > 0,
      };
    },
  };
}

describe('AnalyzerPipeline', () => {
  let pipeline: AnalyzerPipeline;

  beforeEach(() => {
    pipeline = new AnalyzerPipeline();
  });

  describe('registration', () => {
    it('should register an analyzer', () => {
      const analyzer = createMockAnalyzer('test', 10);
      pipeline.register(analyzer);

      expect(pipeline.hasAnalyzer('test')).toBe(true);
      expect(pipeline.size).toBe(1);
    });

    it('should throw on duplicate registration', () => {
      const analyzer = createMockAnalyzer('test', 10);
      pipeline.register(analyzer);

      expect(() => pipeline.register(analyzer)).toThrow(
        'Analyzer "test" is already registered'
      );
    });

    it('should unregister an analyzer', () => {
      const analyzer = createMockAnalyzer('test', 10);
      pipeline.register(analyzer);

      expect(pipeline.unregister('test')).toBe(true);
      expect(pipeline.hasAnalyzer('test')).toBe(false);
      expect(pipeline.size).toBe(0);
    });

    it('should return false when unregistering non-existent analyzer', () => {
      expect(pipeline.unregister('nonexistent')).toBe(false);
    });

    it('should get registered analyzer names', () => {
      pipeline.register(createMockAnalyzer('a', 10));
      pipeline.register(createMockAnalyzer('b', 20));
      pipeline.register(createMockAnalyzer('c', 30));

      expect(pipeline.getRegisteredAnalyzers()).toEqual(['a', 'b', 'c']);
    });

    it('should get analyzer by name', () => {
      const analyzer = createMockAnalyzer('test', 10);
      pipeline.register(analyzer);

      expect(pipeline.getAnalyzer('test')).toBe(analyzer);
      expect(pipeline.getAnalyzer('nonexistent')).toBeUndefined();
    });

    it('should clear all analyzers', () => {
      pipeline.register(createMockAnalyzer('a', 10));
      pipeline.register(createMockAnalyzer('b', 20));

      pipeline.clear();

      expect(pipeline.size).toBe(0);
      expect(pipeline.getRegisteredAnalyzers()).toEqual([]);
    });
  });

  describe('priority ordering', () => {
    it('should sort analyzers by priority (lower first)', () => {
      pipeline.register(createMockAnalyzer('low', 30));
      pipeline.register(createMockAnalyzer('high', 10));
      pipeline.register(createMockAnalyzer('medium', 20));

      const sorted = pipeline.getSortedAnalyzers();
      expect(sorted.map((a) => a.name)).toEqual(['high', 'medium', 'low']);
    });

    it('should execute analyzers in priority order', () => {
      const executionOrder: string[] = [];

      const analyzer1: Analyzer = {
        name: 'first',
        priority: 10,
        displayName: 'First',
        paramStyle: 'named',
        analyze() {
          executionOrder.push('first');
          return { parameters: [], metadata: {}, hasResults: false };
        },
      };

      const analyzer2: Analyzer = {
        name: 'second',
        priority: 20,
        displayName: 'Second',
        paramStyle: 'named',
        analyze() {
          executionOrder.push('second');
          return { parameters: [], metadata: {}, hasResults: false };
        },
      };

      pipeline.register(analyzer2);
      pipeline.register(analyzer1);

      pipeline.execute('SELECT 1');

      expect(executionOrder).toEqual(['first', 'second']);
    });
  });

  describe('execution', () => {
    it('should execute all registered analyzers by default', () => {
      const analyzer1 = createMockAnalyzer('a', 10, [
        {
          name: 'param1',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':param1',
        },
      ]);
      const analyzer2 = createMockAnalyzer('b', 20, [
        {
          name: 'param2',
          position: 0,
          type: 'numeric',
          startIndex: 10,
          endIndex: 15,
          originalText: '$1',
        },
      ]);

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute('SELECT * FROM t WHERE a = :param1 AND b = $1');

      expect(result.parameters).toHaveLength(2);
      expect(result.metadata.executedAnalyzers).toEqual(['a', 'b']);
      expect(result.metadata.shortCircuited).toBe(false);
    });

    it('should respect enabledAnalyzers option', () => {
      pipeline.register(createMockAnalyzer('a', 10));
      pipeline.register(createMockAnalyzer('b', 20));

      const result = pipeline.execute('SELECT 1', {
        enabledAnalyzers: ['a'],
      });

      expect(result.metadata.executedAnalyzers).toEqual(['a']);
    });

    it('should merge parameters from multiple analyzers', () => {
      const analyzer1 = createPatternAnalyzer('named', 10, /:(\w+)/g, 'named');
      const analyzer2 = createPatternAnalyzer('asyncpg', 20, /\$(\d+)/g, 'asyncpg');

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute(
        'SELECT * FROM t WHERE a = :name AND b = $1'
      );

      expect(result.parameters).toHaveLength(2);
      expect(result.parameters[0].type).toBe('named');
      expect(result.parameters[0].name).toBe('name');
      expect(result.parameters[1].type).toBe('asyncpg');
      expect(result.parameters[1].name).toBe('1');
    });

    it('should provide execution metadata', () => {
      pipeline.register(createMockAnalyzer('a', 10));

      const result = pipeline.execute('SELECT 1');

      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.executedAnalyzers).toEqual(['a']);
      expect(typeof result.metadata.shortCircuited).toBe('boolean');
    });
  });

  describe('short-circuit mode', () => {
    it('should stop after first analyzer finds results in short-circuit mode', () => {
      const analyzer1 = createPatternAnalyzer('named', 10, /:(\w+)/g, 'named');
      const analyzer2 = createMockAnalyzer('b', 20, [
        {
          name: 'test',
          position: 0,
          type: 'numeric',
          startIndex: 0,
          endIndex: 5,
          originalText: '$1',
        },
      ]);

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute('SELECT * FROM t WHERE a = :name', {
        shortCircuit: true,
      });

      expect(result.metadata.shortCircuited).toBe(true);
      expect(result.metadata.executedAnalyzers).toEqual(['named']);
    });

    it('should continue if analyzer finds no results in short-circuit mode', () => {
      const analyzer1 = createMockAnalyzer('empty', 10, []);
      const analyzer2 = createMockAnalyzer('found', 20, [
        {
          name: 'test',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':test',
        },
      ]);

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute('SELECT * FROM t WHERE a = :test', {
        shortCircuit: true,
      });

      expect(result.metadata.shortCircuited).toBe(true);
      expect(result.metadata.executedAnalyzers).toEqual(['empty', 'found']);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate parameters by default', () => {
      const analyzer1 = createMockAnalyzer('a', 10, [
        {
          name: 'param',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':param',
        },
      ]);
      const analyzer2 = createMockAnalyzer('b', 20, [
        {
          name: 'param',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':param',
        },
      ]);

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute('SELECT :param');

      expect(result.parameters).toHaveLength(1);
    });

    it('should not deduplicate when option is false', () => {
      const analyzer1 = createMockAnalyzer('a', 10, [
        {
          name: 'param',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':param',
        },
      ]);
      const analyzer2 = createMockAnalyzer('b', 20, [
        {
          name: 'param',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':param',
        },
      ]);

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute('SELECT :param', { deduplicate: false });

      expect(result.parameters).toHaveLength(2);
    });

    it('should keep parameters with different positions', () => {
      const analyzer = createMockAnalyzer('a', 10, [
        {
          name: 'param',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':param',
        },
        {
          name: 'param',
          position: 1,
          type: 'named',
          startIndex: 20,
          endIndex: 25,
          originalText: ':param',
        },
      ]);

      pipeline.register(analyzer);

      const result = pipeline.execute('SELECT :param, :param');

      expect(result.parameters).toHaveLength(2);
    });
  });

  describe('parameter position tracking', () => {
    it('should assign correct positions when merging from multiple analyzers', () => {
      const analyzer1 = createMockAnalyzer('a', 10, [
        {
          name: 'first',
          position: 0,
          type: 'named',
          startIndex: 0,
          endIndex: 5,
          originalText: ':first',
        },
      ]);
      const analyzer2 = createMockAnalyzer('b', 20, [
        {
          name: 'second',
          position: 0,
          type: 'asyncpg',
          startIndex: 10,
          endIndex: 15,
          originalText: '$1',
        },
      ]);

      pipeline.register(analyzer1);
      pipeline.register(analyzer2);

      const result = pipeline.execute('SELECT :first, $1');

      expect(result.parameters[0].position).toBe(0);
      expect(result.parameters[1].position).toBe(1);
    });
  });
});
