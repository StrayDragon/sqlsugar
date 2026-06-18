/**
 * Variable Utilities for Templated SQL Editor
 *
 * Utility functions for variable validation, type checking, and value formatting
 */

import type { EnhancedVariable, TemplateVariable, TemplateVariableValue } from '../types.js';
import type { VariableType as InferenceVariableType } from '../types/inference.js';

export type VariableType = InferenceVariableType;

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
    email: 'test@example.com',
    json: {},
    sql_identifier: 'column_name',
    url: 'https://example.com',
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
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^https?:\/\/.+/.test(value)) return 'url';
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
  const name = variable.name.toLowerCase();
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
      if (name.includes('email')) return 'test@example.com';
      return `demo_${name}`;

    case 'email':
      return 'test@example.com';

    case 'url':
      return 'https://example.com';

    case 'uuid':
      return '00000000-0000-0000-0000-000000000000';

    case 'array':
      return [];

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
