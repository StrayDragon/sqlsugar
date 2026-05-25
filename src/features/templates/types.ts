export type TemplateParamType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'optional' | 'conditional';

export interface TemplateParam {
  name: string;
  type: TemplateParamType;
  required: boolean;
  default?: unknown;
  description?: string;
  options?: string[];  // for enum type
}

export interface SQLTemplate {
  name: string;
  description: string;
  tags: string[];
  dialect: 'universal' | 'postgresql' | 'mysql' | 'sqlite';
  params: TemplateParam[];
  body: string;
}

export interface TemplateFixture {
  name: string;
  templateName: string;
  inputs: Record<string, unknown>;
  expectedOutput: string;
}
