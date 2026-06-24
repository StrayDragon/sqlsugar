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

describe('bugfix: jinja2sql 对齐过滤器 inclause / bind / safe', () => {
  it('{{ xs | inclause }} 渲染为带括号的 IN 字面量列表', () => {
    const out = env.renderString('{{ xs | inclause }}', buildNestedContext({ xs: ['active', 'pending'] }));
    expect(out).toBe("('active', 'pending')");
  });

  it('inclause 对数字数组渲染为裸数字列表', () => {
    const out = env.renderString('{{ ids | inclause }}', buildNestedContext({ ids: [1, 2, 3] }));
    expect(out).toBe('(1, 2, 3)');
  });

  it('inclause 对单个非数组值也能渲染（容错）', () => {
    const out = env.renderString('{{ x | inclause }}', buildNestedContext({ x: 'only' }));
    expect(out).toBe("('only')");
  });

  it('inclause 对空数组渲染为 (NULL)，不报错抹掉整段预览', () => {
    const out = env.renderString('IN {{ xs | inclause }}', buildNestedContext({ xs: [] }));
    expect(out).toBe('IN (NULL)');
  });

  it('字符串内部单引号在 inclause/bind 中被转义', () => {
    const out = env.renderString("{{ s | bind }}", buildNestedContext({ s: "O'Reilly" }));
    expect(out).toBe("'O''Reilly'");
  });

  it('{{ x | bind }} 按字面量内联（null→NULL, 数字裸输出）', () => {
    expect(env.renderString('{{ a | bind }}', buildNestedContext({ a: null }))).toBe('NULL');
    expect(env.renderString('{{ a | bind }}', buildNestedContext({ a: 12 }))).toBe('12');
  });

  it('{{ x | safe }} 原样输出值（nunjucks 内置）', () => {
    expect(env.renderString('{{ d | safe }}', buildNestedContext({ d: 'DESC' }))).toBe('DESC');
  });

  it('identifier 对可迭代值以 . 连接（schema.table 风格）', () => {
    const out = env.renderString('{{ t | identifier }}', buildNestedContext({ t: ['schema', 'users'] }));
    expect(out).toBe('schema.users');
  });

  it('用户真实模板：inclause + 普通变量混用都能被替换', () => {
    const tmpl =
      'SELECT * FROM {{ base | identifier }} WHERE type IN {{ attachment_types | inclause }} LIMIT {{ limit }}';
    const out = env.renderString(
      tmpl,
      buildNestedContext({ base: 'user_bill', attachment_types: ['a', 'b'], limit: 10 })
    );
    expect(out).toBe("SELECT * FROM user_bill WHERE type IN ('a', 'b') LIMIT 10");
  });
});
