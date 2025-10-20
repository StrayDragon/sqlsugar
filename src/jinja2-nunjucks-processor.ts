import * as nunjucks from 'nunjucks';
import { Logger } from './core/logger';
import * as vscode from 'vscode';
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
 * Nunjucks AST 节点的基本类型 - 使用宽松的类型以适应复杂的 AST 结构
 */
interface NunjucksNode extends Record<string, unknown> {
  typename?: string;
  value?: unknown;
  name?: { value?: string } | unknown;
  args?: { children?: unknown[] };
  target?: { value?: string };
  val?: { value?: string };
  children?: unknown[];
  cond?: unknown;
  body?: unknown;
  else_?: unknown;
  arr?: unknown;
  key?: unknown;
  left?: unknown;
  right?: unknown;
}

/**
 * Nunjucks 内部 API 类型扩展
 */
interface NunjucksParser {
  parse: (src: string, extensions?: unknown[], opts?: unknown) => NunjucksNode;
}

interface NunjucksInternal {
  parser?: NunjucksParser;
  nodes?: unknown;
}

function isNunjucksNode(value: unknown): value is NunjucksNode {
  return value !== null && typeof value === 'object';
}

function forEachChild(node: NunjucksNode, fn: (child: NunjucksNode) => void): void {
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (isNunjucksNode(child)) {
        fn(child);
      }
    });
  }
}

/**
 * Jinja2变量接口 (增强版，支持验证信息)
 */
export interface Jinja2Variable {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'uuid' | 'email' | 'url' | 'null';
  defaultValue?: Jinja2VariableValue;
  description?: string;
  required?: boolean;
  filters?: string[];

  valid?: boolean;
  validationError?: string;

  extractionMethod?: 'nunjucks' | 'regex' | 'fallback';
}

/**
 * 基于nunjucks的Jinja2处理器
 * 完全支持Jinja2语法，解决Python脚本沙盒问题
 */
export class Jinja2NunjucksProcessor {
  private static instance: Jinja2NunjucksProcessor;
  private env: nunjucks.Environment;

  private constructor() {

    this.env = new nunjucks.Environment(null, {
      autoescape: false,
      throwOnUndefined: false,
    });


    nunjucks.installJinjaCompat();


    this.addCustomFilters();


    this.addCustomGlobals();


    this.setupFilterFallback();
  }

  public static getInstance(): Jinja2NunjucksProcessor {
    if (!Jinja2NunjucksProcessor.instance) {
      Jinja2NunjucksProcessor.instance = new Jinja2NunjucksProcessor();
    }
    return Jinja2NunjucksProcessor.instance;
  }

  /**
   * 使用 nunjucks 直接渲染模板
   * 这是推荐的渲染方式，确保完全兼容 nunjucks 语法
   */
  public renderTemplate(template: string, context: Record<string, unknown>): string {
    try {

      const nestedContext = this.buildNestedContext(context);
      return this.env.renderString(template, nestedContext);
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('filter not found')) {

        const filterMatch = errorMessage.match(/filter not found: (\w+)/);
        if (filterMatch) {
          Logger.warn(`Unknown filter "${filterMatch[1]}" ignored, returning original value`);
        }

        const contentMatch = template.match(/\{\{\s*([^}]+)\s*\}\}/);
        if (contentMatch) {
          const fullContent = contentMatch[1].trim();

          const variablePart = fullContent.split('|')[0].trim();


          const stringMatch = variablePart.match(/^["'](.*)["']$/);
          if (stringMatch) {
            return stringMatch[1];
          }

          const numMatch = variablePart.match(/^(\d+(?:\.\d+)?)$/);
          if (numMatch) {
            return numMatch[1];
          }

          if (context.hasOwnProperty(variablePart)) {
            return String(context[variablePart]);
          }

          return variablePart;
        }
        return '';
      }
      Logger.error('nunjucks 渲染失败:', error);
      throw new Error(`模板渲染失败: ${errorMessage}`);
    }
  }

  /**
   * 获取嵌套对象的值（支持 user.id 这样的路径）
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * 构建嵌套上下文对象
   * 将扁平的变量名（如 'user.id'）转换为嵌套对象结构（如 { user: { id: value } }）
   */
  private buildNestedContext(flatContext: Record<string, unknown>): Record<string, unknown> {
    const nested: Record<string, unknown> = {};


    const nestedKeys = Object.keys(flatContext).filter(key => key.includes('.'));
    const simpleKeys = Object.keys(flatContext).filter(key => !key.includes('.'));


    nestedKeys.forEach(key => {
      const parts = key.split('.');
      let current = nested;


      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }


      const lastPart = parts[parts.length - 1];
      current[lastPart] = flatContext[key];
    });


    simpleKeys.forEach(key => {

      if (!(key in nested)) {
        nested[key] = flatContext[key];
      }
    });

    return nested;
  }

  /**
   * 添加自定义过滤器
   */
  private addCustomFilters(): void {

    this.env.addFilter('sql_quote', (value: unknown) => {
      if (value === null || value === undefined) {
        return 'null';
      }
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    });

    this.env.addFilter('sql_identifier', (value: string) => {
      return `"${value.replace(/"/g, '""')}"`;
    });


    this.env.addFilter('sql_date', (value: unknown, format: string = 'YYYY-MM-DD') => {
      const date = new Date(value as string | number | Date);
      return this.formatSQLDate(date, format);
    });

    this.env.addFilter('sql_datetime', (value: unknown) => {
      const date = new Date(value as string | number | Date);
      return date.toISOString().replace('T', ' ').replace('Z', '');
    });


    this.env.addFilter('sql_in', (values: unknown[]) => {
      if (Array.isArray(values)) {
        return values
          .map(v => {
            if (v === null || v === undefined) {
              return 'null';
            }
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(', ');
      }
      if (values === null || values === undefined) {
        return 'null';
      }
      return `'${String(values).replace(/'/g, "''")}'`;
    });


    this.env.addFilter('float', (value: unknown) => {
      if (value === null || value === undefined) {
        return 'NaN';
      }
      const result = parseFloat(String(value));
      return isNaN(result) ? 'NaN' : String(result);
    });

    this.env.addFilter('int', (value: unknown, base: number = 10) => {
      if (value === null || value === undefined) {
        return '0';
      }
      const result = parseInt(String(value), base);
      return isNaN(result) ? 'NaN' : String(result);
    });

    this.env.addFilter('string', (value: unknown) => {
      return String(value);
    });

    this.env.addFilter('length', (value: unknown) => {
      if (Array.isArray(value)) {
        return value.length;
      }
      if (typeof value === 'string') {
        return value.length;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length;
      }
      return 0;
    });

    this.env.addFilter('bool', (value: unknown) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
      }
      return Boolean(value);
    });


    this.env.addFilter('default', (value: unknown, defaultValue: unknown, boolean: boolean = false) => {
      if (boolean) {
        return value ? value : defaultValue;
      }
      return value !== undefined && value !== null ? value : defaultValue;
    });


    this.env.addFilter('striptags', (value: string) => {
      if (value === null || value === undefined) {
        return 'null';
      }
      return String(value).replace(/<[^>]*>/g, '');
    });

    this.env.addFilter(
      'truncate',
      (value: unknown, length: number = 255, end: string = '...', killwords: boolean = false) => {
        if (value === null || value === undefined || value === '') {
          return '';
        }
        const str = String(value);
        if (str.length <= length) {
          return str;
        }
        if (length <= end.length) {
          return end;
        }

        const truncatedLength = length - end.length;

        if (!killwords) {

          const lastSpaceIndex = str.lastIndexOf(' ', truncatedLength);
          if (lastSpaceIndex === -1) {

            const truncated = str.substring(0, truncatedLength);
            return truncated + end;
          } else {

            const truncated = str.substring(0, lastSpaceIndex);
            return truncated + end;
          }
        } else {

          const truncated = str.substring(0, truncatedLength);
          return truncated + end;
        }
      }
    );

    this.env.addFilter(
      'wordwrap',
      (
        value: string | unknown,
        width: number = 79,
        break_long_words: boolean = false,
        wrapstring: string = '\n'
      ) => {
        if (value === null || value === undefined || value === '') {
          return '';
        }
        const str = String(value);
        if (!break_long_words && str.length <= width) {
          return str;
        }
        if (break_long_words) {
          const result: string[] = [];
          for (let i = 0; i < str.length; i += width) {
            result.push(str.substring(i, i + width));
          }
          return result.join(wrapstring);
        }
        return str;
      }
    );

    this.env.addFilter('urlencode', (value: string) => {
      return encodeURIComponent(value);
    });


    this.env.addFilter('abs', (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return '0';
      }
      const num = Number(value);
      if (isNaN(num)) {
        return '0';
      }
      return String(Math.abs(num));
    });

    this.env.addFilter('round', (value: unknown, precision: number = 0, method: string = 'common') => {
      if (value === null || value === undefined || value === '') {
        return '0';
      }
      const num = Number(value);
      if (isNaN(num)) {
        return '0';
      }
      if (precision === 0) {
        return String(Math.round(num));
      }
      const factor = Math.pow(10, precision);
      return String(Math.round(num * factor) / factor);
    });

    this.env.addFilter('sum', (value: unknown[], attribute?: string) => {
      if (!Array.isArray(value) || value.length === 0) {
        return '0';
      }
      if (attribute) {
        return String(value.reduce((sum: number, item) => sum + Number((item as Record<string, unknown>)[attribute] || 0), 0));
      }
      return String(value.reduce((sum: number, item) => sum + Number(item || 0), 0));
    });

    this.env.addFilter('min', (value: unknown[], attribute?: string) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Infinity';
      }
      if (attribute) {
        return String(Math.min(...value.map(item => Number((item as Record<string, unknown>)[attribute] || 0))));
      }
      return String(Math.min(...value.map(item => Number(item || 0))));
    });

    this.env.addFilter('max', (value: unknown[], attribute?: string) => {
      if (!Array.isArray(value) || value.length === 0) {
        return '-Infinity';
      }
      if (attribute) {
        return String(Math.max(...value.map(item => Number((item as Record<string, unknown>)[attribute] || 0))));
      }
      return String(Math.max(...value.map(item => Number(item || 0))));
    });


    this.env.addFilter('unique', (value: unknown[]) => {
      return [...new Set(value)];
    });

    this.env.addFilter('reverse', (value: unknown[]) => {
      return [...value].reverse();
    });

    this.env.addFilter('first', (value: unknown[]) => {
      return value && value.length > 0 ? value[0] : '';
    });

    this.env.addFilter('last', (value: unknown[]) => {
      return value && value.length > 0 ? value[value.length - 1] : '';
    });

    this.env.addFilter('length', (value: unknown) => {
      if (Array.isArray(value)) {
        return value.length;
      }
      if (typeof value === 'string') {
        return value.length;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length;
      }
      return 0;
    });

    this.env.addFilter('slice', (value: unknown[], start: number, end?: number) => {
      return value.slice(start, end);
    });

    this.env.addFilter('join', (value: unknown[], separator: string = ', ') => {
      return value
        .map(item => (item === null || item === undefined ? 'null' : String(item)))
        .join(separator);
    });


    this.env.addFilter(
      'dictsort',
      (
        value: Record<string, unknown>,
        case_sensitive: boolean = false,
        by: 'key' | 'value' = 'key'
      ) => {
        const entries = Object.entries(value);
        entries.sort((a, b) => {
          let aValue: unknown, bValue: unknown;
          if (by === 'key') {
            aValue = a[0];
            bValue = b[0];
          } else {
            aValue = a[1];
            bValue = b[1];
          }

          if (!case_sensitive && typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          }

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue);
          }

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return aValue - bValue;
          }


          const aStr = String(aValue);
          const bStr = String(bValue);
          if (aStr < bStr) {
            return -1;
          }
          if (aStr > bStr) {
            return 1;
          }
          return 0;
        });
        return entries;
      }
    );


    this.env.addFilter('tojson', (value: unknown, indent: number = 0) => {
      return JSON.stringify(value, null, indent);
    });


    this.env.addFilter('equalto', (value: unknown, other: unknown) => {
      return value === other;
    });


    this.env.addFilter('filesizeformat', (value: number, binary: boolean = false) => {
      const base = binary ? 1024 : 1000;
      const units = binary
        ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
        : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

      let bytes = Number(value);
      if (bytes < base) {
        return bytes + ' ' + units[0];
      }

      const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
      const size = bytes / Math.pow(base, exp);
      return size.toFixed(1) + ' ' + units[exp];
    });
  }

  /**
   * 添加自定义全局函数
   */
  private addCustomGlobals(): void {

    this.env.addGlobal('now', () => new Date());
    this.env.addGlobal('uuid', () => this.generateUUID());
  }

  /**
   * 从模板中提取变量
   */
  /**
   * 从模板中提取变量 (优先使用 nunjucks AST 解析)
   * 提供最准确的变量提取和模板验证
   */
  public extractVariables(template: string): Jinja2Variable[] {
    try {

      return this.extractVariablesFromAST(template);
    } catch (error) {
      Logger.warn('nunjucks AST 解析失败，尝试 nunjucks 编译验证:', error);

      try {

        return this.extractVariablesWithNunjucksValidation(template);
      } catch (fallbackError) {
        Logger.warn('nunjucks 验证失败，回退到正则表达式方法:', fallbackError);

        return this.extractVariablesWithRegex(template);
      }
    }
  }

  /**
   * 使用 nunjucks 编译验证 + 正则表达式提取 (备选方法)
   */
  private extractVariablesWithNunjucksValidation(template: string): Jinja2Variable[] {

    try {
      nunjucks.compile(template, this.env);
    } catch (validationError) {

      Logger.warn(
        '模板语法警告:',
        validationError instanceof Error ? validationError.message : String(validationError)
      );
    }


    const extractedVariables = this.extractVariablesWithRegex(template);


    return this.enrichVariablesWithNunjucksContext(extractedVariables, template);
  }

  /**
   * 基于AST解析提取变量
   * 使用nunjucks内部API进行更精确的模板分析
   */
  private extractVariablesFromAST(template: string): Jinja2Variable[] {
    const variables: Jinja2Variable[] = [];
    const processedNames = new Set<string>();

    try {

      const nunjucksInternal = nunjucks as unknown as NunjucksInternal;
      const parser = nunjucksInternal.parser as NunjucksParser | undefined;
      const nodes = nunjucksInternal.nodes;

      if (!parser || typeof parser.parse !== 'function' || !nodes) {
        throw new Error('nunjucks内部API不可用');
      }


      const ast = parser.parse(template, [], {});


      this.extractVariablesFromNode(ast, variables, processedNames);


      if (variables.length === 0) {
        throw new Error('AST解析未找到任何变量');
      }


      return variables.map(v => ({
        ...v,
        extractionMethod: 'nunjucks' as const,
        valid: true,
      }));
    } catch (error) {
      throw new Error(`AST解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从AST节点递归提取变量
   */
  private extractVariablesFromNode(
    node: NunjucksNode,
    variables: Jinja2Variable[],
    processedNames: Set<string>
  ): void {
    if (!node || typeof node !== 'object') {
      return;
    }


    switch (node.typename) {
      case 'Symbol':

        if (typeof node.value === 'string') {
          const varName = node.value;
          if (!processedNames.has(varName)) {
          variables.push({
            name: varName,
            type: this.inferVariableType(varName),
            defaultValue: this.getDefaultValue(varName) as Jinja2VariableValue,
            required: this.isRequiredVariable(varName),
            filters: [],
            extractionMethod: 'nunjucks',
          });
          processedNames.add(varName);
          }
        }
        break;

      case 'LookupVal':


        this.extractVariablesFromLookupVal(node, variables, processedNames);
        break;

      case 'Filter':

        this.extractVariablesFromFilter(node, variables, processedNames);

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        break;

      case 'FunCall':

        if (isNunjucksNode(node.name)) {
          this.extractVariablesFromNode(node.name, variables, processedNames);
        }
        if (node.args && Array.isArray(node.args.children)) {
          node.args.children.forEach((arg) => {
            if (isNunjucksNode(arg)) {
              this.extractVariablesFromNode(arg, variables, processedNames);
            }
          });
        }
        break;

      case 'If':

        if (isNunjucksNode(node.cond)) this.extractVariablesFromNode(node.cond, variables, processedNames);
        if (isNunjucksNode(node.body)) this.extractVariablesFromNode(node.body, variables, processedNames);
        if (isNunjucksNode(node.else_)) this.extractVariablesFromNode(node.else_, variables, processedNames);
        break;

      case 'For':

        if (isNunjucksNode(node.arr)) this.extractVariablesFromNode(node.arr, variables, processedNames);
        if (isNunjucksNode(node.body)) this.extractVariablesFromNode(node.body, variables, processedNames);
        break;

      case 'Output':

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        break;

      case 'TemplateData':

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        break;

      case 'Group':

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        break;

      case 'Array':

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        break;

      case 'Pair':

        if (isNunjucksNode(node.key)) this.extractVariablesFromNode(node.key, variables, processedNames);
        if (isNunjucksNode(node.value)) this.extractVariablesFromNode(node.value, variables, processedNames);
        break;

      case 'Dict':

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        break;

      case 'UnaryOp':

        if (isNunjucksNode(node.target)) this.extractVariablesFromNode(node.target, variables, processedNames);
        break;

      case 'BinaryOp':

        if (isNunjucksNode(node.left)) this.extractVariablesFromNode(node.left, variables, processedNames);
        if (isNunjucksNode(node.right)) this.extractVariablesFromNode(node.right, variables, processedNames);
        break;

      case 'Compare':

        if (isNunjucksNode(node.left)) this.extractVariablesFromNode(node.left, variables, processedNames);
        if (isNunjucksNode(node.right)) this.extractVariablesFromNode(node.right, variables, processedNames);
        break;

      default:

        forEachChild(node, (child) => this.extractVariablesFromNode(child, variables, processedNames));
        if (isNunjucksNode(node.body)) this.extractVariablesFromNode(node.body, variables, processedNames);
        if (isNunjucksNode(node.cond)) this.extractVariablesFromNode(node.cond, variables, processedNames);
        if (node.args && Array.isArray(node.args.children)) {
          node.args.children.forEach((arg) => {
            if (isNunjucksNode(arg)) {
              this.extractVariablesFromNode(arg, variables, processedNames);
            }
          });
        }
        break;
    }
  }

  /**
   * 从属性访问节点提取变量
   * 例如：user.id -> 提取为 "user.id"
   */
  private extractVariablesFromLookupVal(
    node: NunjucksNode,
    variables: Jinja2Variable[],
    processedNames: Set<string>
  ): void {
    if (node.target && node.target.value && node.val && node.val.value) {
      const fullVarName = `${node.target.value}.${node.val.value}`;
      if (!processedNames.has(fullVarName)) {
        variables.push({
          name: fullVarName,
          type: this.inferVariableType(fullVarName),
          defaultValue: this.getDefaultValue(fullVarName) as Jinja2VariableValue,
          required: this.isRequiredVariable(fullVarName),
          filters: [],
          extractionMethod: 'nunjucks',
        });
        processedNames.add(fullVarName);
      }
    }


  }

  /**
   * 处理过滤器节点，提取原始变量名
   */
  private extractVariablesFromFilter(
    node: NunjucksNode,
    variables: Jinja2Variable[],
    processedNames: Set<string>
  ): void {

    let filterName: string | undefined;
    const maybeNameValue = (node.name as Record<string, unknown> | undefined)?.value;
    if (typeof maybeNameValue === 'string') {
      filterName = maybeNameValue;
    }

    if (node.args && Array.isArray(node.args.children)) {

      node.args.children.forEach((arg) => {
        if (isNunjucksNode(arg)) {
          if (arg.typename === 'Symbol' && arg.value) {
            const varName = arg.value as string;
            if (!processedNames.has(varName)) {

              variables.push({
                name: varName,
                type: this.inferVariableType(varName),
                defaultValue: this.getDefaultValue(varName) as Jinja2VariableValue,
                required: this.isRequiredVariable(varName),
                filters: filterName ? [filterName] : ([] as string[]),
                extractionMethod: 'nunjucks',
              });
              processedNames.add(varName);
            } else if (typeof filterName === 'string') {

              const existingVar = variables.find(v => v.name === varName);
              if (existingVar && existingVar.filters && !existingVar.filters.includes(filterName)) {
                existingVar.filters.push(filterName);
              }
            }
          } else {

            this.extractVariablesFromNode(arg, variables, processedNames);
          }
        }
      });
    }

  }

  /**
   * 使用正则表达式进行变量提取 (备选方法)
   */
  private extractVariablesWithRegex(template: string): Jinja2Variable[] {
    const variables: Jinja2Variable[] = [];
    const regex = /\{\{\s*([^}]+)\s*\}\}/g;
    const conditionRegex = /\{%\s*(if|elif|for)\s+([^%]+)\s*%}/g;
    const processedNames = new Set<string>();


    let match;
    while ((match = regex.exec(template)) !== null) {
      const expr = match[1].trim();
      const parsed = this.parseExpressionWithFilters(expr);

      if (!processedNames.has(parsed.variableName)) {
        variables.push({
          name: parsed.variableName,
          type: this.inferVariableType(parsed.variableName),
          defaultValue: this.getDefaultValue(parsed.variableName) as Jinja2VariableValue,
          required: this.isRequiredVariable(parsed.variableName),
          filters: parsed.filters,
          extractionMethod: 'regex',
        });
        processedNames.add(parsed.variableName);
      }
    }


    while ((match = conditionRegex.exec(template)) !== null) {
      const condition = match[2].trim();
      const vars = this.extractVariablesFromExpression(condition);

      vars.forEach(varName => {
        if (!processedNames.has(varName)) {
          variables.push({
            name: varName,
            type: this.inferVariableType(varName),
            defaultValue: this.getDefaultValue(varName) as Jinja2VariableValue,
            required: true,
            extractionMethod: 'regex',
          });
          processedNames.add(varName);
        }
      });
    }

    return variables;
  }

  /**
   * 使用nunjucks上下文丰富变量信息
   */
  private enrichVariablesWithNunjucksContext(
    variables: Jinja2Variable[],
    template: string
  ): Jinja2Variable[] {

    return variables.map(variable => {

      const testContext = this.createTestContextForVariable(variable);

      try {

        const testTemplate = `{{ ${variable.name}${variable.filters && variable.filters.length > 0 ? '|' + variable.filters.join('|') : ''} }}`;
        this.env.renderString(testTemplate, testContext);


        return {
          ...variable,
          valid: true,
          extractionMethod: 'nunjucks' as const,
        };
      } catch (error) {

        return {
          ...variable,
          valid: false,
          validationError: error instanceof Error ? error.message : String(error),
          extractionMethod: 'nunjucks' as const,
        };
      }
    });
  }

  /**
   * 为变量创建测试上下文
   */
  private createTestContextForVariable(variable: Jinja2Variable): Record<string, unknown> {
    const context: Record<string, unknown> = {};


    switch (variable.type) {
      case 'number':
        context[variable.name] = 42;
        break;
      case 'date':
        context[variable.name] = '2023-01-01';
        break;
      default:
        context[variable.name] = `demo_${variable.name}`;
    }

    return context;
  }

  /**
   * 解析表达式并提取变量名和过滤器
   */
  private parseExpressionWithFilters(expr: string): { variableName: string; filters: string[] } {

    const parts = expr.split('|').map(part => part.trim());


    const variableName = parts[0];


    const filters = parts.slice(1).map(filterPart => {

      const filterMatch = filterPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\([^)]*\))?/);
      return filterMatch ? filterMatch[1] : filterPart;
    });

    return { variableName, filters };
  }

  /**
   * 从表达式中提取变量名
   */
  private extractVariablesFromExpression(expr: string): string[] {
    const variables: string[] = [];


    if (expr.includes('|')) {

      const parts = expr.split('|');
      const variablePart = parts[0].trim();


      if (variablePart && !variablePart.includes('(')) {

        const varName = variablePart;


        const excludedKeywords = [
          'if',
          'elif',
          'else',
          'endif',
          'for',
          'endfor',
          'in',
          'and',
          'or',
          'not',
          'true',
          'false',
          'none',
          'null',
        ];

        if (!excludedKeywords.includes(varName.toLowerCase())) {
          variables.push(varName);
        }
      }
    } else {

      const varRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)/g;
      let match;

      while ((match = varRegex.exec(expr)) !== null) {
        const varName = match[1];


        const excludedKeywords = [
          'if',
          'elif',
          'else',
          'endif',
          'for',
          'endfor',
          'in',
          'and',
          'or',
          'not',
          'true',
          'false',
          'none',
          'null',
        ];


        if (varName.includes('(')) {
          continue;
        }

        if (!excludedKeywords.includes(varName.toLowerCase())) {
          variables.push(varName);
        }
      }
    }


    const uniqueVariables = Array.from(new Set(variables));
    return uniqueVariables;
  }

  /**
   * 推断变量类型
   */
  private inferVariableType(varName: string): 'string' | 'number' | 'date' | 'boolean' {
    const name = varName.toLowerCase();




    if (
      name.startsWith('is_') ||
      name.startsWith('has_') ||
      name.startsWith('can_') ||
      name.startsWith('should_') ||
      name.startsWith('enable') ||
      name.startsWith('disable') ||
      name.includes('enabled') ||
      name.includes('disabled') ||
      name.includes('active') ||
      name.includes('inactive') ||
      name.includes('deleted') ||
      name.includes('include') ||
      name.includes('exclude') ||
      name.includes('show') ||
      name.includes('hide') ||
      name.includes('visible')
    ) {
      return 'boolean';
    }


    if (
      name.includes('id') ||
      name.includes('num') ||
      name.includes('count') ||
      name.includes('amount')
    ) {
      return 'number';
    }


    if (
      name.includes('date') ||
      name.includes('time') ||
      name.includes('created') ||
      name.includes('updated')
    ) {
      return 'date';
    }


    return 'string';
  }

  /**
   * 获取变量的默认值
   */
  private getDefaultValue(varName: string): unknown {
    const type = this.inferVariableType(varName);

    switch (type) {
      case 'number':
        return 42;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'boolean':

        const name = varName.toLowerCase();


        if (name.includes('deleted') || name.includes('remove') || name.includes('clear')) {

          return false;
        } else if (name.includes('include') && !name.includes('deleted')) {

          return true;
        } else if (name.includes('show') || name.includes('enable') || name.includes('active')) {
          return true;
        } else if (
          name.includes('exclude') ||
          name.includes('hide') ||
          name.includes('disable') ||
          name.includes('inactive')
        ) {
          return false;
        } else {
          return true;
        }
      default:
        return `demo_${varName}`;
    }
  }

  /**
   * 判断变量是否必需
   */
  private isRequiredVariable(varName: string): boolean {
    const name = varName.toLowerCase();
    return name.includes('id') || name.includes('required') || name.includes('mandatory');
  }

  /**
   * 生成演示SQL
   */
  public generateDemoSQL(template: string): { sql: string; variables: Jinja2Variable[] } {
    const variables = this.extractVariables(template);
    const context: Record<string, unknown> = {};


    variables.forEach(variable => {
      context[variable.name] = variable.defaultValue;
    });


    const sql = this.renderTemplate(template, context);

    return { sql, variables };
  }

  /**
   * 使用自定义变量渲染模板
   */
  public renderWithCustomVariables(template: string, variables: Record<string, unknown>): string {
    return this.renderTemplate(template, variables);
  }

  /**
   * 验证模板语法
   */
  public validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {

      if (!template.includes('{{') && !template.includes('{%')) {
        return { valid: true, errors: [] };
      }


      nunjucks.compile(template, this.env);

      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(`Syntax error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }

  /**
   * 格式化SQL日期
   */
  private formatSQLDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 生成UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 获取模板预览
   */
  public getTemplatePreview(template: string, maxLength: number = 100): string {
    let preview = template.replace(/\{\{\s*([^}]+)\s*\}\}/g, '{{$1}}');
    preview = preview.replace(/\{%\s*([^%]+)\s*%}/g, '{%$1%}');

    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength) + '...';
    }

    return preview;
  }

  /**
   * 设置过滤器容错处理
   */
  private setupFilterFallback(): void {


    const unknownFilters = ['tojson', 'filesizeformat', 'equalto'];

    unknownFilters.forEach(filterName => {
      try {
        this.env.getFilter(filterName);
      } catch (error) {

        this.env.addFilter(filterName, (value: unknown, ...args: unknown[]) => {
          Logger.warn(`Unknown filter "${filterName}" ignored, returning original value`);
          return value;
        });
      }
    });
  }

  /**
   * 获取支持的过滤器列表
   */
  public getSupportedFilters(): string[] {
    return [

      'sql_quote',
      'sql_identifier',
      'sql_date',
      'sql_datetime',
      'sql_in',


      'int',
      'float',
      'string',
      'bool',


      'title',
      'upper',
      'lower',
      'capitalize',
      'trim',
      'default',
      'striptags',
      'truncate',
      'wordwrap',
      'urlencode',


      'abs',
      'round',
      'sum',
      'min',
      'max',


      'length',
      'join',
      'replace',
      'split',
      'slice',
      'first',
      'last',
      'unique',
      'reverse',
      'sort',


      'dictsort',


      'tojson',


      'equalto',


      'filesizeformat',
    ];
  }

  /**
   * 获取支持的语法特性
   */
  public getSupportedFeatures(): string[] {
    return [
      '变量输出 ({{ variable }})',
      '条件语句 ({% if %}...{% endif %})',
      '循环语句 ({% for item in items %}...{% endfor %})',
      '过滤器 ({{ variable | filter }})',
      '注释 ({# comment #})',
      '模板继承 ({% extends %})',
      '包含模板 ({% include %})',
      '宏定义 ({% macro %})',
      '集合操作',
      '自定义过滤器和函数',
    ];
  }
}
