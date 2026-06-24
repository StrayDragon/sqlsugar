/**
 * Templated SQL Editor bugfix 回归测试
 *
 * 覆盖三类已修复问题：
 *   1. {{ var | identifier }} 不再因 filter 缺失而渲染失败
 *   2. 带过滤器的变量可被高亮器识别为可点击元素
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createAlignedNunjucksEnv, buildNestedContext } from '../shared/nunjucks-setup';
import TemplateHighlighter from '../features/templated-sql/ui/utils/template-highlighter';
import type { EnhancedVariable } from '../features/templated-sql/ui/types';

const env = createAlignedNunjucksEnv();

function varObj(name: string, type: string): EnhancedVariable {
  return {
    name,
    type,
    isRequired: false,
    filters: [],
    position: { startIndex: 0, endIndex: 0, line: 0, column: 0, name, fullMatch: `{{ ${name} }}` },
  } as EnhancedVariable;
}

describe('bugfix: identifier filter 渲染 (问题2A)', () => {
  it('{{ t | identifier }} 原样输出值（不包裹）', () => {
    const out = env.renderString('{{ t | identifier }}', buildNestedContext({ t: 'users' }));
    expect(out).toBe('users');
  });

  it('null 值时输出空串，避免出现 "null" 字面量', () => {
    const out = env.renderString('A{{ t | identifier }}B', buildNestedContext({ t: null }));
    expect(out).toBe('AB');
  });

  it('用户真实模板：identifier 与普通变量都能被替换', () => {
    const tmpl =
      'SELECT id FROM {{ revised_user_bill_base_info | identifier }} WHERE user_id = {{ user_id }} LIMIT 1';
    const out = env.renderString(
      tmpl,
      buildNestedContext({ revised_user_bill_base_info: 'user_bill', user_id: 12 })
    );
    expect(out).toBe('SELECT id FROM user_bill WHERE user_id = 12 LIMIT 1');
  });
});

describe('bugfix: 带过滤器的变量高亮 (问题1)', () => {
  beforeAll(() => {
    // 提供一个恒等 hljs，避免依赖真实 highlight.js 运行时。
    (globalThis as unknown as { hljs: unknown }).hljs = {
      highlight: (code: string) => ({ value: code }),
    };
  });

  it('{{ var | identifier }} 被包成可点击 span', () => {
    const hl = new TemplateHighlighter();
    const res = hl.highlightTemplate(
      'FROM {{ t | identifier }} WHERE id = {{ user_id }}',
      [varObj('t', 'string'), varObj('user_id', 'number')],
      { t: 'users', user_id: 12 }
    );
    expect(res.html).toContain('data-variable="t"');
    expect(res.html).toContain('data-variable="user_id"');
  });

  it('纯变量仍正常高亮', () => {
    const hl = new TemplateHighlighter();
    const res = hl.highlightTemplate('{{ user_id }}', [varObj('user_id', 'number')], { user_id: 7 });
    expect(res.html).toContain('data-variable="user_id"');
  });

  it('变量名作为前缀时不会被误匹配（user 不命中 user_id）', () => {
    const hl = new TemplateHighlighter();
    const res = hl.highlightTemplate('{{ user_id }}', [varObj('user', 'string')], { user: 'x' });
    expect(res.html).not.toContain('data-variable="user"');
  });
});
