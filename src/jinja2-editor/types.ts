/**
 * Jinja2 Variable Type Definitions
 */

/**
 * 变量值的类型联合
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
 * 枚举值的类型
 */
export type Jinja2EnumValue = string | number;

/**
 * HTML input 元素的类型
 */
export type HTMLInputType = 'number' | 'text' | 'email' | 'url' | 'password';

/**
 * 支持的变量类型
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

export interface Jinja2Variable {
  name: string;
  type: Jinja2VariableType;
  description?: string;
  defaultValue?: Jinja2VariableValue;
  filters?: string[];
  isRequired?: boolean;
  enumValues?: Jinja2EnumValue[];
  pattern?: string;
  format?: string;
  subType?: string;
  confidence?: number;
}

export interface Jinja2Template {
  original: string;
  variables: Jinja2Variable[];
  metadata?: {
    lineCount: number;
    hasConditionals: boolean;
    hasLoops: boolean;
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export interface VariableChangeEvent {
  name: string;
  value: Jinja2VariableValue;
  type?: Jinja2VariableType;
}

export interface TemplateRenderEvent {
  template: string;
  values: Record<string, Jinja2VariableValue>;
  result: string;
  error?: string;
}
