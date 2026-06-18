import * as nunjucks from 'nunjucks';

declare module 'nunjucks' {
  interface Environment {
    addTest(name: string, func: (...args: unknown[]) => boolean): void;
  }
}

const BASE_10 = 10;
const BINARY_BASE = 1024;
const DECIMAL_BASE = 1000;
const DEFAULT_TRUNCATE_LENGTH = 255;
const DEFAULT_WORD_WRAP_WIDTH = 79;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatSQLDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('%Y', String(year)).replace('YYYY', String(year))
    .replace('%m', month).replace('MM', month)
    .replace('%d', day).replace('DD', day)
    .replace('%H', hours).replace('HH', hours)
    .replace('%M', minutes).replace('mm', minutes)
    .replace('%S', seconds).replace('ss', seconds);
}

function registerSQLFilters(env: nunjucks.Environment): void {
  env.addFilter('sql_quote', (value: unknown) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    return String(value);
  });

  env.addFilter('sql_identifier', (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  });

  env.addFilter('sql_date', (value: unknown, format: string = 'YYYY-MM-DD') => {
    const date = new Date(value as string | number | Date);
    return formatSQLDate(date, format);
  });

  env.addFilter('sql_datetime', (value: unknown) => {
    const date = new Date(value as string | number | Date);
    return date.toISOString().replace('T', ' ').replace('Z', '');
  });

  env.addFilter('sql_in', (values: unknown[]) => {
    if (Array.isArray(values)) {
      return values
        .map(v => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`))
        .join(', ');
    }
    if (values === null || values === undefined) return 'null';
    return `'${String(values).replace(/'/g, "''")}'`;
  });
}

function registerTypeFilters(env: nunjucks.Environment): void {
  env.addFilter('float', (value: unknown) => {
    if (value === null || value === undefined) return 'NaN';
    const result = parseFloat(String(value));
    return isNaN(result) ? 'NaN' : String(result);
  });

  env.addFilter('int', (value: unknown, base: number = BASE_10) => {
    if (value === null || value === undefined) return '0';
    const result = parseInt(String(value), base);
    return isNaN(result) ? 'NaN' : String(result);
  });

  env.addFilter('string', (value: unknown) => String(value));

  env.addFilter('bool', (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
    }
    return Boolean(value);
  });

  env.addFilter('default', (value: unknown, defaultValue: unknown, boolean: boolean = false) => {
    if (boolean) return value ? value : defaultValue;
    return value !== undefined && value !== null ? value : defaultValue;
  });
}

function registerStringFilters(env: nunjucks.Environment): void {
  env.addFilter('striptags', (value: string) => {
    if (value === null || value === undefined) return 'null';
    return String(value).replace(/<[^>]*>/g, '');
  });

  env.addFilter('truncate', (value: unknown, length: number = DEFAULT_TRUNCATE_LENGTH, end: string = '...', killwords: boolean = false) => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value);
    if (str.length <= length) return str;
    if (length <= end.length) return end;
    const truncatedLength = length - end.length;
    if (!killwords) {
      const lastSpaceIndex = str.lastIndexOf(' ', truncatedLength);
      if (lastSpaceIndex === -1) return str.substring(0, truncatedLength) + end;
      return str.substring(0, lastSpaceIndex) + end;
    }
    return str.substring(0, truncatedLength) + end;
  });

  env.addFilter('wordwrap', (value: string | unknown, width: number = DEFAULT_WORD_WRAP_WIDTH, break_long_words: boolean = false, wrapstring: string = '\n') => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value);
    if (!break_long_words && str.length <= width) return str;
    if (break_long_words) {
      const result: string[] = [];
      for (let i = 0; i < str.length; i += width) {
        result.push(str.substring(i, i + width));
      }
      return result.join(wrapstring);
    }
    return str;
  });

  env.addFilter('urlencode', (value: string) => encodeURIComponent(value));
}

function registerCollectionFilters(env: nunjucks.Environment): void {
  env.addFilter('length', (value: unknown) => {
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'string') return value.length;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length;
    return 0;
  });

  env.addFilter('abs', (value: unknown) => {
    if (value === null || value === undefined || value === '') return '0';
    const num = Number(value);
    return isNaN(num) ? '0' : String(Math.abs(num));
  });

  env.addFilter('round', (value: unknown, precision: number = 0, method: string = 'common') => {
    if (value === null || value === undefined || value === '') return '0';
    const num = Number(value);
    if (isNaN(num)) return '0';
    const factor = Math.pow(BASE_10, precision);
    if (method === 'ceil') return String(Math.ceil(num * factor) / factor);
    if (method === 'floor') return String(Math.floor(num * factor) / factor);
    return String(Math.round(num * factor) / factor);
  });

  env.addFilter('sum', (value: unknown[], attribute?: string) => {
    if (!Array.isArray(value) || value.length === 0) return '0';
    if (attribute) return String(value.reduce((sum: number, item) => sum + Number((item as Record<string, unknown>)[attribute] || 0), 0));
    return String(value.reduce((sum: number, item) => sum + Number(item || 0), 0));
  });

  env.addFilter('min', (value: unknown[], attribute?: string) => {
    if (!Array.isArray(value) || value.length === 0) return 'Infinity';
    if (attribute) return String(Math.min(...value.map(item => Number((item as Record<string, unknown>)[attribute] || 0))));
    return String(Math.min(...value.map(item => Number(item || 0))));
  });

  env.addFilter('max', (value: unknown[], attribute?: string) => {
    if (!Array.isArray(value) || value.length === 0) return '-Infinity';
    if (attribute) return String(Math.max(...value.map(item => Number((item as Record<string, unknown>)[attribute] || 0))));
    return String(Math.max(...value.map(item => Number(item || 0))));
  });

  env.addFilter('unique', (value: unknown[]) => [...new Set(value)]);
  env.addFilter('reverse', (value: unknown[]) => [...value].reverse());
  env.addFilter('first', (value: unknown[]) => (value && value.length > 0 ? value[0] : ''));
  env.addFilter('last', (value: unknown[]) => (value && value.length > 0 ? value[value.length - 1] : ''));
  env.addFilter('slice', (value: unknown[], start: number, end?: number) => value.slice(start, end));
  env.addFilter('join', (value: unknown[], separator: string = ', ') => {
    return value.map(item => (item === null || item === undefined ? 'null' : String(item))).join(separator);
  });

  env.addFilter('dictsort', (value: Record<string, unknown>, case_sensitive: boolean = false, by: 'key' | 'value' = 'key') => {
    const entries = Object.entries(value);
    entries.sort((a, b) => {
      const [aValue, bValue] = by === 'key' ? [a[0], b[0]] : [a[1], b[1]];
      if (!case_sensitive && typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') return aValue.localeCompare(bValue);
      if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
      return String(aValue) < String(bValue) ? -1 : String(aValue) > String(bValue) ? 1 : 0;
    });
    return entries;
  });

  env.addFilter('tojson', (value: unknown, indent: number = 0) => JSON.stringify(value, null, indent));
  env.addFilter('equalto', (value: unknown, other: unknown) => value === other);
  env.addFilter('filesizeformat', (value: number, binary: boolean = false) => {
    const base = binary ? BINARY_BASE : DECIMAL_BASE;
    const units = binary
      ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const bytes = Number(value);
    if (bytes < base) return bytes + ' ' + units[0];
    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const size = bytes / Math.pow(base, exp);
    return size.toFixed(1) + ' ' + units[exp];
  });
}

function registerTemplateTests(env: nunjucks.Environment): void {
  env.addTest('divisibleby', (...args: unknown[]) => (args[0] as number) % (args[1] as number) === 0);
  env.addTest('even', (...args: unknown[]) => (args[0] as number) % 2 === 0);
  env.addTest('odd', (...args: unknown[]) => (args[0] as number) % 2 !== 0);
  env.addTest('number', (...args: unknown[]) => typeof args[0] === 'number' && !isNaN(Number(args[0])));
  env.addTest('integer', (...args: unknown[]) => typeof args[0] === 'number' && Number.isInteger(args[0]));
  env.addTest('float', (...args: unknown[]) => typeof args[0] === 'number' && !Number.isInteger(args[0]));
  env.addTest('string', (...args: unknown[]) => typeof args[0] === 'string');
  env.addTest('mapping', (...args: unknown[]) => typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]));
  env.addTest('iterable', (...args: unknown[]) => Array.isArray(args[0]) || typeof args[0] === 'string');
  env.addTest('sequence', (...args: unknown[]) => Array.isArray(args[0]));
  env.addTest('sameas', (...args: unknown[]) => args[0] === args[1]);
  env.addTest('none', (...args: unknown[]) => args[0] === null || args[0] === undefined);
  env.addTest('boolean', (...args: unknown[]) => typeof args[0] === 'boolean');
  env.addTest('lower', (...args: unknown[]) => typeof args[0] === 'string' && args[0] === args[0].toLowerCase());
  env.addTest('upper', (...args: unknown[]) => typeof args[0] === 'string' && args[0] === args[0].toUpperCase());
  env.addTest('in', (...args: unknown[]) => {
    const [value, seq] = args;
    if (Array.isArray(seq)) return seq.includes(value);
    if (typeof seq === 'string' && typeof value === 'string') return seq.includes(value);
    if (typeof seq === 'object' && seq !== null) return String(value) in (seq as Record<string, unknown>);
    return false;
  });
}

function registerCustomGlobals(env: nunjucks.Environment): void {
  env.addGlobal('now', () => new Date());
  env.addGlobal('uuid', () => generateUUID());
}

/**
 * 创建对齐的 Nunjucks 环境，Extension 端和 WebView 端共用
 */
export function createAlignedNunjucksEnv(): nunjucks.Environment {
  const env = new nunjucks.Environment(null, {
    autoescape: false,
    throwOnUndefined: false,
  });

  nunjucks.installJinjaCompat();
  registerSQLFilters(env);
  registerTypeFilters(env);
  registerStringFilters(env);
  registerCollectionFilters(env);
  registerTemplateTests(env);
  registerCustomGlobals(env);

  return env;
}

/**
 * 将扁平变量名转换为嵌套对象
 * 例如 { 'user.id': 1 } → { user: { id: 1 } }
 */
export function buildNestedContext(flatContext: Record<string, unknown>): Record<string, unknown> {
  const nested: Record<string, unknown> = {};

  const nestedKeys = Object.keys(flatContext).filter(key => key.includes('.'));
  const simpleKeys = Object.keys(flatContext).filter(key => !key.includes('.'));

  nestedKeys.forEach(key => {
    const parts = key.split('.');
    let current = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = flatContext[key];
  });

  simpleKeys.forEach(key => {
    if (!(key in nested)) nested[key] = flatContext[key];
  });

  return nested;
}
