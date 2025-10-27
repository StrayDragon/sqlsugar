/**
 * Variable Utilities for V2 Editor
 *
 * Utility functions for variable validation, type checking, and value formatting
 */

import type { EnhancedVariable, Jinja2Variable, Jinja2VariableValue } from '../types.js';

export type VariableType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'uuid' | 'email' | 'url' | 'null';

/**
 * Gets a default value for a given variable type
 */
export function getDefaultValueForType(type: VariableType): Jinja2VariableValue {
  const defaults: Record<VariableType, Jinja2VariableValue> = {
    string: 'demo_value',
    number: 42,
    integer: 42,
    boolean: true,
    date: new Date().toISOString().split('T')[0],
    time: '00:00:00',
    datetime: new Date().toISOString(),
    json: {},
    uuid: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    url: 'https://example.com',
    null: null
  };

  return defaults[type];
}

/**
 * Validates a value against its variable type
 */
export function validateValue(value: Jinja2VariableValue, type: VariableType): string | null {
  if (value == null && type !== 'null') {
    return 'Value cannot be null or undefined';
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') return 'Value must be a string';
      break;

    case 'number':
    case 'integer':
      if (typeof value !== 'number' || isNaN(value)) {
        return 'Value must be a valid number';
      }
      if (type === 'integer' && !Number.isInteger(value)) {
        return 'Value must be an integer';
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') return 'Value must be a boolean';
      break;

    case 'date':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'Value must be a valid date in YYYY-MM-DD format';
      }
      break;

    case 'datetime':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'Value must be a valid datetime in ISO format';
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Value must be a valid email address';
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
        return 'Value must be a valid URL starting with http:// or https://';
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

    case 'null':
      if (value !== null && value !== 'null') {
        return 'Value must be null';
      }
      break;
  }

  return null;
}

/**
 * Infers variable type from a value
 */
export function inferTypeFromValue(value: Jinja2VariableValue): VariableType {
  if (value === null || value === 'null') return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  if (typeof value === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^https?:\/\/.+/.test(value)) return 'url';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'datetime';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid';

    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }
  if (typeof value === 'object') return 'json';

  return 'string';
}

/**
 * Formats a value for display based on its type
 */
export function formatValueForDisplay(value: Jinja2VariableValue, type: VariableType): string {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (type === 'json' && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Creates a new Jinja2Variable with the provided properties
 */
export function createJinja2Variable(
  name: string,
  type: VariableType,
  options: Partial<Jinja2Variable> = {}
): Jinja2Variable {
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
export function getContextualDefaultValue(variable: EnhancedVariable): Jinja2VariableValue {
  const name = variable.name.toLowerCase();
  const type = variable.type as VariableType;


  switch (type) {
    case 'number':
    case 'integer':
      if (name.includes('id')) return 123;
      if (name.includes('count')) return 10;
      if (name.includes('limit')) return 50;
      return 42;

    case 'boolean':
      if (name.startsWith('is_') || name.startsWith('has_')) return true;
      if (name.includes('deleted') || name.includes('remove')) return false;
      return true;

    case 'date':
    case 'datetime':
      if (name.includes('created') || name.includes('start')) return '2024-01-01';
      if (name.includes('updated') || name.includes('end')) return '2024-12-31';
      return new Date().toISOString().split('T')[0];

    case 'string':
      if (name.includes('id')) return 'sample_id';
      if (name.includes('name')) return 'Sample Name';
      if (name.includes('email')) return 'test@example.com';
      return `demo_${name}`;

    case 'email':
      return 'test@example.com';

    case 'url':
      return 'https://example.com';

    case 'uuid':
      return '00000000-0000-0000-0000-000000000000';

    default:
      return getDefaultValueForType(type);
  }
}
