import type { Jinja2Variable, Jinja2VariableType } from '../types.js';

/**
 * Creates a new Jinja2Variable with the provided properties
 */
export function createJinja2Variable(
  name: string,
  type: Jinja2VariableType,
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
 * Type guard to check if an object is a valid Jinja2Variable
 */
export function isJinja2Variable(obj: unknown): obj is Jinja2Variable {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const variable = obj as Record<string, unknown>;

  return (
    typeof variable.name === 'string' &&
    typeof variable.type === 'string' &&
    isValidJinja2VariableType(variable.type) &&
    typeof variable.isRequired === 'boolean' &&
    (variable.description === undefined || typeof variable.description === 'string') &&
    (variable.filters === undefined || Array.isArray(variable.filters))
  );
}

/**
 * Validates a Jinja2Variable and returns validation errors
 */
export function validateJinja2Variable(variable: Jinja2Variable): string[] {
  const errors: string[] = [];

  // Validate name
  if (!variable.name || typeof variable.name !== 'string') {
    errors.push('Variable name is required and must be a string');
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
    errors.push('Variable name must be a valid identifier (letters, numbers, underscores, cannot start with number)');
  }

  // Validate type
  if (!variable.type || !isValidJinja2VariableType(variable.type)) {
    errors.push(`Invalid variable type: ${variable.type}`);
  }

  // Validate filters
  if (variable.filters) {
    if (!Array.isArray(variable.filters)) {
      errors.push('Filters must be an array');
    } else {
      for (let i = 0; i < variable.filters.length; i++) {
        const filter = variable.filters[i];
        if (typeof filter !== 'string') {
          errors.push(`Filter at index ${i} must be a string`);
        } else if (!/^[a-zA-Z0-9_]+$/.test(filter)) {
          errors.push(`Invalid filter name: ${filter}`);
        }
      }
    }
  }

  return errors;
}

/**
 * Checks if a value is a valid Jinja2VariableType
 */
function isValidJinja2VariableType(type: string): type is Jinja2VariableType {
  const validTypes: Jinja2VariableType[] = [
    'string',
    'number',
    'integer',
    'boolean',
    'date',
    'datetime',
    'json',
    'uuid',
    'email',
    'url',
    'null'
  ];

  return validTypes.includes(type as Jinja2VariableType);
}

/**
 * Gets a default value for a given variable type
 */
export function getDefaultValueForType(type: Jinja2VariableType): any {
  const defaults: Record<Jinja2VariableType, any> = {
    string: 'demo_value',
    number: 42,
    integer: 42,
    boolean: true,
    date: new Date().toISOString().split('T')[0],
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
 * Formats a value for display based on its type
 */
export function formatValueForDisplay(value: any, type: Jinja2VariableType): string {
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
 * Validates a value against its variable type
 */
export function validateValue(value: any, type: Jinja2VariableType): string | null {
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
export function inferTypeFromValue(value: any): Jinja2VariableType {
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