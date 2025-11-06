/**
 * Variable serialization utilities for type-safe storage
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { Jinja2VariableType, Jinja2VariableValue } from '../types/types';

/**
 * Serialized variable value format
 */
export interface SerializedVariableValue {
  value: unknown;
  type: Jinja2VariableType;
  isValid: boolean;
  lastModified: number;
  source: 'user' | 'default' | 'inferred' | 'suggestion';
  metadata?: Record<string, unknown>;
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  includeMetadata?: boolean;
  strictTypeValidation?: boolean;
  compressArrays?: boolean;
  formatDates?: boolean;
}

/**
 * Variable serialization and deserialization utilities
 */
export class VariableSerializer {
  private readonly defaultOptions: Required<SerializationOptions> = {
    includeMetadata: true,
    strictTypeValidation: true,
    compressArrays: false,
    formatDates: true
  };

  /**
   * Serialize a single variable value
   */
  public serialize(
    value: Jinja2VariableValue,
    type: Jinja2VariableType,
    options?: SerializationOptions
  ): string {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const serializable: SerializedVariableValue = {
        value: this.transformForSerialization(value, type, opts),
        type,
        isValid: this.validateValueType(value, type),
        lastModified: Date.now(),
        source: 'user'
      };

      if (opts.includeMetadata) {
        serializable.metadata = {
          originalType: typeof value,
          isArray: Array.isArray(value),
          isNull: value === null,
          isUndefined: value === undefined,
          size: this.calculateSize(value)
        };
      }

      return JSON.stringify(serializable, this.jsonReplacer);
    } catch (error) {
      // Fallback to simple serialization
      const fallback = {
        value: String(value),
        type: 'string' as Jinja2VariableType,
        isValid: false,
        lastModified: Date.now(),
        source: 'user',
        error: 'Serialization failed, converted to string'
      };

      return JSON.stringify(fallback);
    }
  }

  /**
   * Deserialize a single variable value
   */
  public deserialize(data: string): Jinja2VariableValue {
    try {
      const parsed: SerializedVariableValue = JSON.parse(data, this.jsonReviver);

      if (!parsed.isValid && parsed.type !== 'string') {
        // Handle invalid serialization
        return parsed.value as Jinja2VariableValue;
      }

      return this.transformFromSerialization(parsed.value, parsed.type);
    } catch (error) {
      // Return null for completely failed deserialization
      return null;
    }
  }

  /**
   * Serialize multiple variables
   */
  public serializeBatch(
    variables: Record<string, Jinja2VariableValue>,
    types: Record<string, Jinja2VariableType>,
    options?: SerializationOptions
  ): string {
    const serialized: Record<string, string> = {};

    for (const [name, value] of Object.entries(variables)) {
      const type = types[name] || this.inferType(value);
      serialized[name] = this.serialize(value, type, options);
    }

    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      variables: serialized
    });
  }

  /**
   * Deserialize multiple variables
   */
  public deserializeBatch(data: string): Record<string, Jinja2VariableValue> {
    try {
      const parsed = JSON.parse(data);

      if (parsed.version && parsed.variables) {
        // Batch format
        const result: Record<string, Jinja2VariableValue> = {};
        for (const [name, serialized] of Object.entries(parsed.variables)) {
          result[name] = this.deserialize(serialized as string);
        }
        return result;
      } else {
        // Legacy format - direct object
        return this.transformLegacyFormat(parsed);
      }
    } catch (error) {
      return {};
    }
  }

  /**
   * Transform value for serialization
   */
  private transformForSerialization(
    value: Jinja2VariableValue,
    type: Jinja2VariableType,
    options: Required<SerializationOptions>
  ): unknown {
    switch (type) {
      case 'date':
      case 'time':
      case 'datetime':
        if (value instanceof Date) {
          return options.formatDates ? value.toISOString() : value.getTime();
        }
        return value;

      case 'json':
        if (typeof value === 'object' && value !== null) {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }
        return value;

      case 'boolean':
        return Boolean(value);

      case 'number':
      case 'integer':
        const num = Number(value);
        return isNaN(num) ? 0 : num;

      case 'array':
        if (Array.isArray(value)) {
          if (options.compressArrays) {
            return this.compressArray(value);
          }
          return value;
        }
        return Array.isArray(value) ? value : [value];

      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return value;
        }
        return { value };

      case 'uuid':
      case 'email':
      case 'url':
      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Transform value from serialization
   */
  private transformFromSerialization(value: unknown, type: Jinja2VariableType): Jinja2VariableValue {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'date':
        if (typeof value === 'string') {
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? null : parsed;
        }
        if (typeof value === 'number') {
          return new Date(value);
        }
        return null;

      case 'time':
        if (typeof value === 'string') {
          return value;
        }
        return String(value);

      case 'datetime':
        if (typeof value === 'string') {
          return new Date(value);
        }
        return null;

      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        }
        return value;

      case 'boolean':
        return Boolean(value);

      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;

      case 'integer':
        const int = parseInt(String(value), 10);
        return isNaN(int) ? 0 : int;

      case 'array':
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return [value];
          }
        }
        return [value];

      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return value;
        }
        return { value };

      case 'null':
        return null;

      default:
        return String(value);
    }
  }

  /**
   * JSON replacer for special types
   */
  private jsonReplacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }

    if (typeof value === 'bigint') {
      return { __type: 'BigInt', value: value.toString() };
    }

    if (value instanceof RegExp) {
      return { __type: 'RegExp', value: value.toString() };
    }

    if (typeof value === 'undefined') {
      return { __type: 'Undefined' };
    }

    return value;
  }

  /**
   * JSON reviver for special types
   */
  private jsonReviver(key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null && '__type' in value) {
      const typed = value as { __type: string; value: unknown };

      switch (typed.__type) {
        case 'Date':
          return new Date(typed.value as string);

        case 'BigInt':
          return BigInt(typed.value as string);

        case 'RegExp':
          return new RegExp(typed.value as string);

        case 'Undefined':
          return undefined;

        default:
          return typed.value;
      }
    }

    return value;
  }

  /**
   * Validate value against type
   */
  private validateValueType(value: Jinja2VariableValue, type: Jinja2VariableType): boolean {
    if (value === null || value === undefined) {
      return type === 'null';
    }

    switch (type) {
      case 'string':
      case 'email':
      case 'url':
      case 'uuid':
        return typeof value === 'string';

      case 'number':
        return typeof value === 'number' && !isNaN(value);

      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);

      case 'boolean':
        return typeof value === 'boolean';

      case 'date':
      case 'datetime':
        return value instanceof Date || typeof value === 'string' || typeof value === 'number';

      case 'time':
        return typeof value === 'string';

      case 'json':
        return typeof value === 'string' || typeof value === 'object';

      case 'array':
        return Array.isArray(value);

      case 'object':
        return typeof value === 'object' && !Array.isArray(value);

      case 'null':
        return value === null;

      default:
        return true;
    }
  }

  /**
   * Infer type from value
   */
  private inferType(value: Jinja2VariableValue): Jinja2VariableType {
    if (value === null) return 'null';
    if (typeof value === 'undefined') return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (value instanceof Date) return 'datetime';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') {
      // Try to infer more specific types
      if (this.isEmail(value)) return 'email';
      if (this.isUrl(value)) return 'url';
      if (this.isUuid(value)) return 'uuid';
      if (this.isTimeString(value)) return 'time';
      return 'string';
    }

    return 'string';
  }

  /**
   * Check if string is email
   */
  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Check if string is URL
   */
  private isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if string is UUID
   */
  private isUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Check if string is time
   */
  private isTimeString(value: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(value);
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: Jinja2VariableValue): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return 0;
  }

  /**
   * Compress array for storage
   */
  private compressArray(array: unknown[]): { type: 'compressed'; items: unknown[]; unique: boolean } {
    return {
      type: 'compressed',
      items: array,
      unique: array.length === new Set(array).size
    };
  }

  /**
   * Transform legacy format
   */
  private transformLegacyFormat(data: Record<string, unknown>): Record<string, Jinja2VariableValue> {
    const result: Record<string, Jinja2VariableValue> = {};

    for (const [key, value] of Object.entries(data)) {
      result[key] = this.transformFromSerialization(value, this.inferType(value));
    }

    return result;
  }
}

/**
 * Singleton instance for variable serialization
 */
export const variableSerializer = new VariableSerializer();