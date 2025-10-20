/**
 * Jinja2 Editor V2 联动滚动功能测试
 * 测试 Template Editor 和 SQL Preview 面板之间的联动滚动
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Jinja2EditorV2 } from '../jinja2-editor-v2/components/jinja2-editor-v2.js';

describe('Jinja2 Editor V2 Template-SQL 联动滚动功能', () => {
  let element: Jinja2EditorV2;

  beforeEach(() => {
    element = new Jinja2EditorV2();
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
  });

  it('应该能够创建联动滚动按钮', () => {
    // 渲染组件
    element.template = 'SELECT * FROM users WHERE id = {{ user_id }}';
    element.values = { user_id: 42 };
    element.variables = [{ name: 'user_id', type: 'number', defaultValue: 42, isRequired: true, description: 'User ID' }];

    // 连接到DOM
    element.connectedCallback();

    // 查找联动滚动按钮（在主编辑器头部）
    const syncButton = element.shadowRoot?.querySelector('.header-button[title*="联动"]');
    expect(syncButton).toBeTruthy();
    expect(syncButton?.textContent).toContain('联动');
  });

  it('应该能够在主编辑器中启用联动滚动', () => {
    element.template = 'SELECT * FROM users WHERE id = {{ user_id }}';
    element.values = { user_id: 42 };
    element.variables = [{ name: 'user_id', type: 'number', defaultValue: 42, isRequired: true, description: 'User ID' }];
    element.connectedCallback();

    // 初始状态应该是禁用的
    expect(element.syncScroll).toBe(false);

    // 查找并点击联动滚动按钮（在主编辑器头部）
    const syncButton = element.shadowRoot?.querySelector('.header-button[title*="联动"]') as HTMLButtonElement;
    expect(syncButton).toBeTruthy();
    expect(syncButton?.disabled).toBe(false);

    // 点击按钮启用联动滚动
    syncButton?.click();

    // 检查状态是否已启用
    expect(element.syncScroll).toBe(true);
  });

  it('应该能够正确设置联动滚动状态', () => {
    element.template = 'SELECT *\nFROM users\nWHERE id = {{ user_id }}';
    element.values = { user_id: 42 };
    element.variables = [{ name: 'user_id', type: 'number', defaultValue: 42, isRequired: true, description: 'User ID' }];
    element.connectedCallback();

    // 验证初始状态
    expect(element.syncScroll).toBe(false);

    // 设置启用状态
    element.syncScroll = true;
    expect(element.syncScroll).toBe(true);

    // 设置禁用状态
    element.syncScroll = false;
    expect(element.syncScroll).toBe(false);
  });

  it('应该能够找到 Template Editor 和 SQL Preview 的滚动容器', async () => {
    element.template = 'SELECT * FROM users WHERE id = {{ user_id }}';
    element.values = { user_id: 42 };
    element.variables = [{ name: 'user_id', type: 'number', defaultValue: 42, isRequired: true, description: 'User ID' }];
    element.connectedCallback();

    // 等待DOM更新
    await element.updateComplete;

    // 查找 Template Editor 的滚动容器
    const templateContainer = element.shadowRoot?.querySelector('.editor-panel .panel-content') as HTMLElement;
    expect(templateContainer).toBeTruthy();

    // 查找 SQL Preview 的滚动容器
    const sqlContainer = element.shadowRoot?.querySelector('.preview-panel .panel-content') as HTMLElement;
    expect(sqlContainer).toBeTruthy();
  });
});

// 声明全局以避免 TypeScript 错误
declare global {
  interface HTMLElementTagNameMap {
    'jinja2-editor-v2': Jinja2EditorV2;
  }
}
