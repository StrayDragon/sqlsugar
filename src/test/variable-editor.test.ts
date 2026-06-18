/**
 * Variable Editor Tests
 *
 * Tests for the unified variable editor component.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../features/templated-sql/ui/components/variable-editor.js';
import type { VariableEditor } from '../features/templated-sql/ui/components/variable-editor.js';
import type { TemplateVariable } from '../features/templated-sql/ui/types.js';
import type { ExtractedParameter } from '../features/templated-sql/analyzers/types.js';

describe('VariableEditor', () => {
  let element: VariableEditor;

  beforeEach(async () => {
    element = document.createElement('variable-editor');
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
  });

  it('should render empty state when no variables', async () => {
    const emptyState = element.shadowRoot!.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState!.textContent).toContain('No variables');
  });

  it('should render Jinja2 variables', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number', isRequired: true },
      { name: 'name', type: 'string' },
    ];
    element.variables = variables;
    await element.updateComplete;

    const items = element.shadowRoot!.querySelectorAll('.variable-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('user_id');
    expect(items[1].textContent).toContain('name');
  });

  it('should render parameter placeholders', async () => {
    const parameters: ExtractedParameter[] = [
      {
        name: '1',
        position: 0,
        type: 'asyncpg',
        startIndex: 0,
        endIndex: 2,
        originalText: '$1',
      },
      {
        name: 'name',
        position: 1,
        type: 'named',
        startIndex: 10,
        endIndex: 15,
        originalText: ':name',
      },
    ];
    element.parameters = parameters;
    await element.updateComplete;

    const items = element.shadowRoot!.querySelectorAll('.variable-item');
    expect(items).toHaveLength(2);
  });

  it('should render unified variables from both sources', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number' },
    ];
    const parameters: ExtractedParameter[] = [
      {
        name: 'name',
        position: 0,
        type: 'named',
        startIndex: 10,
        endIndex: 15,
        originalText: ':name',
      },
    ];

    element.variables = variables;
    element.parameters = parameters;
    await element.updateComplete;

    const items = element.shadowRoot!.querySelectorAll('.variable-item');
    expect(items).toHaveLength(2);
  });

  it('should show type tags', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number' },
    ];
    element.variables = variables;
    await element.updateComplete;

    const typeTag = element.shadowRoot!.querySelector('.var-type-tag');
    expect(typeTag).toBeTruthy();
    expect(typeTag!.textContent).toContain('jinja2');
  });

  it('should show required indicator', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number', isRequired: true },
    ];
    element.variables = variables;
    await element.updateComplete;

    const required = element.shadowRoot!.querySelector('.var-required');
    expect(required).toBeTruthy();
    expect(required!.textContent).toBe('*');
  });

  it('should group by source type when groupBySource is true', async () => {
    element.groupBySource = true;

    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number' },
    ];
    const parameters: ExtractedParameter[] = [
      {
        name: 'name',
        position: 0,
        type: 'named',
        startIndex: 10,
        endIndex: 15,
        originalText: ':name',
      },
    ];

    element.variables = variables;
    element.parameters = parameters;
    await element.updateComplete;

    const groups = element.shadowRoot!.querySelectorAll('.variable-group');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('should render flat when groupBySource is false', async () => {
    element.groupBySource = false;

    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number' },
    ];
    element.variables = variables;
    await element.updateComplete;

    const groups = element.shadowRoot!.querySelectorAll('.variable-group');
    expect(groups).toHaveLength(0);
  });

  it('should show value preview', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number', defaultValue: 123 },
    ];
    element.variables = variables;
    element.values = { user_id: 456 };
    await element.updateComplete;

    const preview = element.shadowRoot!.querySelector('.var-value-preview');
    expect(preview).toBeTruthy();
    expect(preview!.textContent).toBe('456');
  });

  it('should use default value when no value set', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number', defaultValue: 123 },
    ];
    element.variables = variables;
    await element.updateComplete;

    const preview = element.shadowRoot!.querySelector('.var-value-preview');
    expect(preview).toBeTruthy();
    expect(preview!.textContent).toBe('123');
  });

  it('should handle variable click', async () => {
    const variables: TemplateVariable[] = [
      { name: 'user_id', type: 'number' },
    ];
    element.variables = variables;
    await element.updateComplete;

    const item = element.shadowRoot!.querySelector('.variable-item') as HTMLElement;
    item.click();
    await element.updateComplete;

    expect(element.selectedVariable).toBe('user_id');
  });
});
