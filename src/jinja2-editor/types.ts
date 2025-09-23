/**
 * Jinja2 Variable Type Definitions
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
  defaultValue?: any;
  filters?: string[];
  isRequired?: boolean;
  enumValues?: any[];
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
  value: any;
  type?: Jinja2VariableType;
}

export interface TemplateRenderEvent {
  template: string;
  values: Record<string, any>;
  result: string;
  error?: string;
}