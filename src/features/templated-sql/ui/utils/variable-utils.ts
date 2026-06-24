/**
 * Variable Utilities for Templated SQL Editor
 *
 * Utility functions for variable validation, type checking, and value formatting
 */

import type { EnhancedVariable, TemplateVariable, TemplateVariableValue } from '../types.js';
import type { VariableType as InferenceVariableType } from '../types/inference.js';

export type VariableType = InferenceVariableType;

/**
 * 会被当作「裸值输出即非法 SQL」的时序类型：date / datetime / time。
 * 这些类型的变量在渲染时需要用单引号包成 SQL 字符串字面量
 * （如 '2024-01-01'），而不是裸输出 2024-01-01。
 */
export const TEMPORAL_SQL_QUOTED_TYPES: ReadonlySet<string> = new Set([
  'date',
  'datetime',
  'time',
]);

/**
 * 将模板里「裸输出」的时序类型变量改写为带 bind 过滤器的形式，使其渲染成
 * 单引号 SQL 字符串字面量（date → '2024-01-01'）。
 *
 * 只改写形如 {{ name }} 的裸输出；已经带过滤器的 {{ name | xxx }}、
 * 带属性访问的 {{ name.attr }}、以及同名前缀变量（如 start_date_extra）
 * 都不会被误伤。这样既能让裸 {{ date }} 自动加引号，又不会破坏
 * sql_date / sql_datetime 等需要原始值的过滤器。
 */
export function quoteDateOutputsInTemplate(
  template: string,
  temporalVarNames: string[]
): string {
  if (temporalVarNames.length === 0) return template;
  let out = template;
  for (const name of temporalVarNames) {
    if (!name) continue;
    const re = new RegExp(`{{\\s*${escapeRegex(name)}\\s*}}`, 'g');
    out = out.replace(re, `{{ ${name} | bind }}`);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a sample value for a single element property based on its name.
 * Used to generate meaningful default arrays for for-loop collections.
 */
function sampleValueForProperty(prop: string): TemplateVariableValue {
  const p = prop.toLowerCase();
  if (p === 'id' || p.endsWith('_id')) return 1;
  if (p.startsWith('is_') || p.startsWith('has_') || p === 'active' || p === 'enabled') return true;
  if (p.includes('name') || p === 'label' || p === 'title') return `Sample ${prop}`;
  if (p.includes('price') || p.includes('amount') || p.includes('total')) return 99.99;
  if (p.includes('count') || p.includes('qty') || p === 'quantity') return 10;
  if (p.includes('date') || p.includes('time')) return '2024-01-01';
  return `sample_${prop}`;
}

/**
 * Build a sample array for a for-loop collection variable.
 * If `elementProperties` is known (collected from the loop body), produce an
 * array of objects with those fields so the template renders meaningfully.
 * Otherwise fall back to a small array of primitives.
 */
export function buildSampleArray(elementProperties?: string[]): TemplateVariableValue {
  if (elementProperties && elementProperties.length > 0) {
    const makeElement = (seed: number) => {
      const obj: Record<string, TemplateVariableValue> = {};
      elementProperties.forEach(prop => {
        const base = sampleValueForProperty(prop);
        // vary numeric / string sample values per element so iterations differ
        if (typeof base === 'number') obj[prop] = base + seed;
        else if (typeof base === 'string' && !/[:@/-]/.test(base)) obj[prop] = `${base}_${seed + 1}`;
        else obj[prop] = base;
      });
      return obj;
    };
    return [makeElement(0), makeElement(1), makeElement(2)];
  }
  // Fallback: a couple of primitive items
  return ['item1', 'item2', 'item3'];
}

/**
 * Gets a default value for a given variable type
 */
export function getDefaultValueForType(type: VariableType): TemplateVariableValue {
  const defaults: Record<VariableType, TemplateVariableValue> = {
    string: 'demo_value',
    number: 42,
    date: new Date().toISOString().split('T')[0],
    boolean: true,
    array: [],
    object: {},
    uuid: '00000000-0000-0000-0000-000000000000',
    json: {},
    sql_identifier: 'column_name',
    phone: '+1234567890',
    currency: '100.00',
    time: '00:00:00',
    datetime: new Date().toISOString(),
    integer: 42,
    null: null,
    custom: 'custom_value',
    unknown: 'unknown'
  };

  return defaults[type];
}

/**
 * Validates a value against its variable type
 */
export function validateValue(value: TemplateVariableValue, type: VariableType): string | null {
  if (value == null) {
    return 'Value cannot be null or undefined';
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') return 'Value must be a string';
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return 'Value must be a valid number';
      }
      break;

    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return 'Value must be an integer';
      }
      break;

    case 'date':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'Value must be a valid date in YYYY-MM-DD format';
      }
      break;

    case 'time':
      if (typeof value !== 'string' || !/^\d{2}:\d{2}:\d{2}$/.test(value)) {
        return 'Value must be a valid time in HH:MM:SS format';
      }
      break;

    case 'datetime':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'Value must be a valid datetime in ISO format';
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') return 'Value must be a boolean';
      break;

    case 'array':
      if (!Array.isArray(value)) return 'Value must be an array';
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return 'Value must be an object';
      }
      break;

    case 'uuid':
      if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return 'Value must be a valid UUID';
      }
      break;

    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        } else if (typeof value !== 'object') {
          return 'Value must be a valid JSON object or string';
        }
      } catch {
        return 'Value must be valid JSON';
      }
      break;

    case 'sql_identifier':
      if (typeof value !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        return 'Value must be a valid SQL identifier';
      }
      break;

    case 'phone':
      if (typeof value !== 'string' || !/^\+?[0-9\s\-\(\)]{10,}$/.test(value)) {
        return 'Value must be a valid phone number';
      }
      break;

    case 'currency':
      if (typeof value !== 'string' && typeof value !== 'number' || isNaN(Number(value))) {
        return 'Value must be a valid currency amount';
      }
      break;

    case 'null':
      if (value !== null) {
        return 'Value must be null';
      }
      break;

    case 'custom':

      break;

    case 'unknown':

      break;
  }

  return null;
}

/**
 * Infers variable type from a value
 */
export function inferTypeFromValue(value: TemplateVariableValue): VariableType {
  if (value === null) return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid';
    if (/^\+?[0-9\s\-\(\)]{10,}$/.test(value)) return 'phone';

    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';

  return 'string';
}

/**
 * Formats a value for display based on its type
 */
export function formatValueForDisplay(value: TemplateVariableValue, type: VariableType): string {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value) || type === 'object' || type === 'json') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Creates a new TemplateVariable with the provided properties
 */
export function createTemplateVariable(
  name: string,
  type: VariableType,
  options: Partial<TemplateVariable> = {}
): TemplateVariable {
  return {
    name,
    type,
    isRequired: false,
    description: '',
    filters: [],
    ...options
  };
}

/**
 * Gets a contextual default value for a variable based on its name and type
 */
export function getContextualDefaultValue(variable: EnhancedVariable): TemplateVariableValue {
  // Special case: variables used as SQL identifiers (e.g. {{ user | identifier }})
  // should default to the variable name literal itself.
  const filters = variable.filters ?? [];
  const name = variable.name.toLowerCase();
  const isIdentifierFilter = filters.some(f => f === 'identifier' || f === 'sql_identifier');
  if (isIdentifierFilter) {
    const lastSegment = variable.name.split('.').pop() ?? variable.name;
    return lastSegment;
  }

  // IN 子句（jinja2sql inclause / 本地 sql_in）需要数组样本：
  // id 类 → 数字数组；status/type/state/kind → 枚举字符串；其余给通用字符串样本。
  const isInclauseFilter = filters.some(f => f === 'inclause' || f === 'sql_in');
  if (isInclauseFilter) {
    if (name.includes('id')) return [1, 2, 3];
    if (name.includes('status') || name.includes('type') || name.includes('state') || name.includes('kind')) {
      return ['active', 'pending'];
    }
    return ['value1', 'value2'];
  }

  const type = variable.type;

  switch (type) {
    case 'number':
      if (name.includes('id')) return 123;
      if (name.includes('count')) return 10;
      if (name.includes('limit')) return 50;
      return 42;

    case 'boolean':
      if (name.startsWith('is_') || name.startsWith('has_')) return true;
      if (name.includes('deleted') || name.includes('remove')) return false;
      return true;

    case 'date':
      if (name.includes('created') || name.includes('start')) return '2024-01-01';
      if (name.includes('updated') || name.includes('end')) return '2024-12-31';
      return new Date().toISOString().split('T')[0];

    case 'string':
      if (name.includes('id')) return 'sample_id';
      if (name.includes('name')) return 'Sample Name';
      return `demo_${name}`;

    case 'uuid':
      return '00000000-0000-0000-0000-000000000000';

    case 'array':
      return buildSampleArray(variable.elementProperties);

    case 'object':
      return {};

    case 'phone':
      return '+1234567890';

    case 'currency':
      return '100.00';

    case 'sql_identifier':
      return 'column_name';

    default:
      return getDefaultValueForType(type);
  }
}
