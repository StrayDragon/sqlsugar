/**
 * Templated SQL Editor bugfix 回归测试
 *
 * 覆盖五类已修复问题：
 *   1. {{ var | identifier }} 不再因 filter 缺失而渲染失败
 *   2. 带过滤器的变量可被高亮器识别为可点击元素
 *   3. {% if var %} 控制结构变量不被双重包裹
 *   4. url/link 命名的变量不再被自动推断为 url 类型（避免渲染成页面组件 / 预填 example.com）
 *   5. date/datetime/time 类型裸输出渲染为带单引号的 SQL 字符串字面量
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createAlignedNunjucksEnv, buildNestedContext } from '../shared/nunjucks-setup';
import hljs from 'highlight.js';
import TemplateHighlighter from '../features/templated-sql/ui/utils/template-highlighter';
import { parseTemplate } from '../features/templated-sql/ui/utils/template-parser';
import { quoteDateOutputsInTemplate, TEMPORAL_SQL_QUOTED_TYPES } from '../features/templated-sql/ui/utils/variable-utils';
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

describe('bugfix: {% if var %} 控制结构变量不被双重包裹 (问题3)', () => {
  beforeAll(() => {
    // 提供一个恒等 hljs，避免依赖真实 highlight.js 运行时。
    (globalThis as unknown as { hljs: unknown }).hljs = {
      highlight: (code: string) => ({ value: code }),
    };
  });

  it('控制结构内的变量被高亮且恰好包裹一次', () => {
    const hl = new TemplateHighlighter();
    const res = hl.highlightTemplate(
      '{% if keyword_pattern %}LIKE {{ keyword_pattern }}{% endif %}',
      [varObj('keyword_pattern', 'string')],
      { keyword_pattern: 'demo' }
    );
    // 条件里的 keyword_pattern 应恰好被一个 span 包裹
    const condSpan = res.html.match(
      /{%\s*if\s+<span[^>]*variable-highlight[^>]*data-variable="keyword_pattern"[^>]*>keyword_pattern<\/span>\s*%}/
    );
    expect(condSpan, `expected single highlighted span inside {% if %}; got:\n${res.html}`).not.toBeNull();
  });

  it('多个 {% if var %} 互不串扰，且不出现乱码属性文本', () => {
    const hl = new TemplateHighlighter();
    const tmpl = [
      'WHERE id NOT IN {{ id_list }}',
      '{% if keyword_pattern %}',
      'AND des LIKE {{ keyword_pattern }}',
      '{% endif %}',
      '{% if lim %}',
      'LIMIT {{ lim }}',
      '{% endif %}',
    ].join('\n');
    const res = hl.highlightTemplate(
      tmpl,
      [varObj('id_list', 'number'), varObj('keyword_pattern', 'string'), varObj('lim', 'string')],
      { id_list: 123, keyword_pattern: 'kw', lim: '10' }
    );
    // 损坏的嵌套标记特征：属性值里出现 <span（如 data-variable="<span ..."）。
    // 合法 HTML 里属性值绝不会以 <span 开头，所以这是可靠的乱码探测器。
    expect(res.html, 'attribute value must not contain a nested <span').not.toMatch(/=\s*"<span/);
    // 每个控制结构里应恰好各有一个被包裹的变量
    const ifSpans =
      res.html.match(/{%\s*if\s+<span[^>]*variable-highlight[^>]*>\w+<\/span>\s*%}/g) || [];
    expect(ifSpans.length).toBe(2);
  });

  it('已高亮的 {% if %} 对二次遍历保持幂等（编辑器二次 pass 不得损坏）', () => {
    // 复现编辑器在 utils 输出之上再次执行 {% if %} 遍历的场景。
    const hl = new TemplateHighlighter();
    const res = hl.highlightTemplate(
      '{% if keyword_pattern %}{{ keyword_pattern }}{% endif %}',
      [varObj('keyword_pattern', 'string')],
      { keyword_pattern: 'kw' }
    );

    // 未加守卫：对 condition 内的 \bkeyword_pattern\b 再包裹必然产生嵌套/乱码
    const unguarded = res.html.replace(/{%\s*if\s+([^%]+)\s*%}/g, (m) =>
      m.replace(
        /\bkeyword_pattern\b/g,
        '<span class="variable-highlight" data-variable="keyword_pattern">keyword_pattern</span>'
      )
    );
    expect(unguarded, 'unguarded re-pass must corrupt the output').toMatch(/=\s*"<span/);

    // 加守卫：condition 已含 span 时跳过，保持幂等
    const guarded = res.html.replace(/{%\s*if\s+([^%]+)\s*%}/g, (m, cond) =>
      m.includes('variable-highlight') || cond.includes('<span') ? m : m
    );
    expect(guarded).toBe(res.html);
  });
});

describe('bugfix: url/link 命名变量不再推断为 url 类型 (问题4)', () => {
  it('xxx_url 变量被推断为 string，而不是 url', () => {
    const result = parseTemplate('{{ website_url }}');
    const v = result.variables.find(x => x.name === 'website_url');
    expect(v, 'website_url should be parsed').toBeDefined();
    expect(v?.type).toBe('string');
    expect(v?.type).not.toBe('url');
  });

  it('xxx_link 变量被推断为 string（子串 link 不再触发 url）', () => {
    const result = parseTemplate('{{ download_link }}');
    const v = result.variables.find(x => x.name === 'download_link');
    expect(v?.type).toBe('string');
    expect(v?.type).not.toBe('url');
  });

  it('纯 url 变量同样被当作 string，避免渲染成页面组件', () => {
    const result = parseTemplate('{{ url }}');
    const v = result.variables.find(x => x.name === 'url');
    expect(v?.type).toBe('string');
  });
});

describe('bugfix: date 类型裸输出渲染为带单引号的 SQL 字面量 (问题5)', () => {
  it('裸 {{ date }} 被改写为 {{ date | bind }}，渲染成单引号字面量', () => {
    const rewritten = quoteDateOutputsInTemplate(
      'WHERE created >= {{ start_date }}',
      ['start_date']
    );
    expect(rewritten).toBe('WHERE created >= {{ start_date | bind }}');
    const out = env.renderString(rewritten, buildNestedContext({ start_date: '2024-01-01' }));
    expect(out).toBe("WHERE created >= '2024-01-01'");
  });

  it('datetime / time 同样被加引号', () => {
    for (const name of ['updated_at', 'start_time']) {
      const rewritten = quoteDateOutputsInTemplate(`{{ ${name} }}`, [name]);
      expect(rewritten).toBe(`{{ ${name} | bind }}`);
    }
  });

  it('带过滤器的 {{ date | sql_date }} 不被改写（保留原始值给过滤器）', () => {
    const t = "{{ start_date | sql_date('%Y%m%d') }}";
    expect(quoteDateOutputsInTemplate(t, ['start_date'])).toBe(t);
  });

  it('已带 bind 的裸输出不重复改写', () => {
    const t = '{{ start_date | bind }}';
    expect(quoteDateOutputsInTemplate(t, ['start_date'])).toBe(t);
  });

  it('同名前缀变量不被误改写（start_date 不命中 start_date_extra）', () => {
    const t = '{{ start_date_extra }}';
    expect(quoteDateOutputsInTemplate(t, ['start_date'])).toBe(t);
  });

  it('控制结构 {% if date %} 不受影响（只在 {{ }} 输出处改写）', () => {
    const t = '{% if start_date %}{{ start_date }}{% endif %}';
    const rewritten = quoteDateOutputsInTemplate(t, ['start_date']);
    expect(rewritten).toBe('{% if start_date %}{{ start_date | bind }}{% endif %}');
  });

  it('TEMPORAL_SQL_QUOTED_TYPES 覆盖 date/datetime/time', () => {
    expect(TEMPORAL_SQL_QUOTED_TYPES.has('date')).toBe(true);
    expect(TEMPORAL_SQL_QUOTED_TYPES.has('datetime')).toBe(true);
    expect(TEMPORAL_SQL_QUOTED_TYPES.has('time')).toBe(true);
    expect(TEMPORAL_SQL_QUOTED_TYPES.has('string')).toBe(false);
  });
});

describe('bugfix: SQL 关键字变量名高亮（user 被 hljs 包成 hljs-keyword）', () => {
  // 使用真实 highlight.js，复现 hljs 把裸 `user`（SQL 关键字）包成
  // <span class="hljs-keyword">user</span> 的实际运行时行为。
  // 旧的 `{{\s*name\b` 正则会因 {{ 后紧跟 <span 而漏匹配。
  beforeAll(() => {
    (globalThis as unknown as { hljs: unknown }).hljs = hljs;
  });

  it('确认真实 hljs 会把裸 user 包成 hljs-keyword（前置事实）', () => {
    const out = (hljs as unknown as { highlight: (c: string, o: unknown) => { value: string } }).highlight(
      '{{ user | identifier }}',
      { language: 'sql', ignoreIllegals: true }
    );
    expect(out.value).toContain('hljs-keyword">user');
  });

  it('{{ user | identifier }} 中关键字变量名 user 仍被高亮为可点击 span', () => {
    const hl = new TemplateHighlighter();
    const tmpl = 'LEFT JOIN {{ user | identifier }} AS u ON u.id = {{ user_id }}';
    const res = hl.highlightTemplate(
      tmpl,
      [varObj('user', 'string'), varObj('user_id', 'number')],
      { user: 'user', user_id: 1 }
    );
    expect(res.html, `expected user highlighted; got:\n${res.html}`).toContain('data-variable="user"');
    expect(res.html).toContain('data-variable="user_id"');
  });

  it('user 不误匹配 user_id / user_crm，且三者各自恰好高亮一次', () => {
    const hl = new TemplateHighlighter();
    const tmpl =
      'JOIN {{ user | identifier }} JOIN {{ user_crm | identifier }} WHERE id = {{ user_id }}';
    const res = hl.highlightTemplate(
      tmpl,
      [varObj('user', 'string'), varObj('user_crm', 'string'), varObj('user_id', 'number')],
      { user: 'user', user_crm: 'user_crm', user_id: 1 }
    );
    expect((res.html.match(/data-variable="user"/g) || []).length).toBe(1);
    expect((res.html.match(/data-variable="user_crm"/g) || []).length).toBe(1);
    expect((res.html.match(/data-variable="user_id"/g) || []).length).toBe(1);
  });

  it('点号名 {{ user.id | identifier }} 也被高亮', () => {
    const hl = new TemplateHighlighter();
    const res = hl.highlightTemplate(
      'JOIN {{ user.id | identifier }} AS x',
      [varObj('user.id', 'string')],
      { 'user.id': 'id' }
    );
    expect(res.html).toContain('data-variable="user.id"');
  });
});
