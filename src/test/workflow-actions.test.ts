import { describe, it, expect } from 'vitest';
import { buildNamedParamVariables, wrapForSourceWriteBack } from '../features/templated-sql/workflow-actions';

describe('workflow-actions', () => {
  it('builds named param variables with paramPattern', () => {
    const vars = buildNamedParamVariables(['user_id', 'status']);
    expect(vars).toEqual([
      {
        name: 'user_id',
        type: 'string',
        description: 'named parameter: :user_id',
        paramPattern: ':user_id',
      },
      {
        name: 'status',
        type: 'string',
        description: 'named parameter: :status',
        paramPattern: ':status',
      },
    ]);
  });

  it('wraps write-back content with original python quotes', () => {
    const wrapped = wrapForSourceWriteBack('f"""SELECT 1"""', 'SELECT 2', 'python');
    expect(wrapped).toBe('f"""SELECT 2"""');
  });

  it('wraps write-back content with template literals for ts', () => {
    const wrapped = wrapForSourceWriteBack('`SELECT 1`', 'SELECT 2', 'typescript');
    expect(wrapped).toBe('`SELECT 2`');
  });
});
