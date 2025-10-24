/**
 * 共享类型定义
 * 包含跨功能模块使用的通用类型
 */

/**
 * Jinja2变量值类型
 */
export type Jinja2VariableValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

/**
 * Jinja2变量类型枚举
 */
export type Jinja2VariableType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'json'
  | 'uuid'
  | 'email'
  | 'url'
  | 'null';

