import { describe, it, expect } from 'vitest';
import { detectEnabledAnalyzers } from '../features/templated-sql/analyzers/detect';

describe('detectEnabledAnalyzers', () => {
  it('detects named style', () => {
    expect(detectEnabledAnalyzers('SELECT * FROM t WHERE id = :user_id')).toContain('named');
  });

  it('detects asyncpg style', () => {
    expect(detectEnabledAnalyzers('SELECT * FROM t WHERE id = $1')).toContain('asyncpg');
  });

  it('detects pyformat style', () => {
    expect(detectEnabledAnalyzers('SELECT * FROM t WHERE id = %(user_id)s')).toContain('pyformat');
  });

  it('detects numeric style', () => {
    expect(detectEnabledAnalyzers('SELECT * FROM t WHERE id = :1')).toContain('numeric');
  });

  it('includes jinja2 when markers present', () => {
    const found = detectEnabledAnalyzers('SELECT {{ col }} FROM t WHERE id = :id');
    expect(found).toContain('jinja2');
    expect(found).toContain('named');
  });

  it('falls back to jinja2+named when nothing matches', () => {
    expect(detectEnabledAnalyzers('SELECT 1')).toEqual(['jinja2', 'named']);
  });
});
