import * as nunjucks from 'nunjucks';
import { Logger } from '../../core/logger';
import {
  DEFAULT_VALUES,
  BOOLEAN_PATTERNS,
  NUMBER_PATTERNS,
  DATE_PATTERNS,
  STRING_PATTERNS,
  STRING_DEFAULTS,
  PROCESSING_CONFIG,
} from './constants';
import { LRUCache } from './ui/utils/lru-cache';
import { createAlignedNunjucksEnv, buildNestedContext as sharedBuildNestedContext } from '../../shared/nunjucks-setup';
import {
  JINJA2_REGEX,
  JINJA2_KEYWORDS as SHARED_JINJA2_KEYWORDS,
  extractVariableFromExpression as sharedExtractVariable,
} from '../../shared/template-patterns';

export type TemplateVariableValue =
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
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'uuid' | 'null';
  defaultValue?: TemplateVariableValue;
  description?: string;
  required?: boolean;
  filters?: string[];
  /** For parameter placeholders ($1, :param, etc.): the literal text to replace in rendered SQL */
  paramPattern?: string;

  valid?: boolean;
  validationError?: string;

  extractionMethod?: 'nunjucks' | 'regex' | 'fallback';
}

/**
 * 基于nunjucks的Jinja2处理器
 * 完全支持Jinja2语法，解决Python脚本沙盒问题
 */
export class TemplateProcessor {
  private static instance: TemplateProcessor;
  private env: nunjucks.Environment;
  private variableCache: LRUCache<TemplateVariable[]>;
  private templateCache: LRUCache<{ valid: boolean; errors: string[] }>;

  private constructor() {
    this.env = createAlignedNunjucksEnv();
    this.variableCache = new LRUCache<TemplateVariable[]>(PROCESSING_CONFIG.MAX_ITERATIONS_FOR_LRU);
    this.templateCache = new LRUCache<{ valid: boolean; errors: string[] }>(50);
  }

  public static getInstance(): TemplateProcessor {
    if (!TemplateProcessor.instance) {
      TemplateProcessor.instance = new TemplateProcessor();
    }
    return TemplateProcessor.instance;
  }

  /**
   * 使用 nunjucks 直接渲染模板
   * 这是推荐的渲染方式，确保完全兼容 nunjucks 语法
   */
  public renderTemplate(_template: string, context: Record<string, unknown>): string {
    try {

      const nestedContext = sharedBuildNestedContext(context);
      return this.env.renderString(_template, nestedContext);
    } catch (_error) {

      const errorMessage = _error instanceof Error ? _error.message : String(_error);
      if (errorMessage.includes('filter not found')) {

        const filterMatch = errorMessage.match(/filter not found: (\w+)/);
        if (filterMatch) {
          Logger.warn(`Unknown filter "${filterMatch[1]}" ignored, returning original value`);
        }

        const contentMatch = _template.match(/\{\{\s*([^}]+)\s*\}\}/);
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
      Logger.error('nunjucks 渲染失败:', _error);
      throw new Error(`模板渲染失败: ${errorMessage}`);
    }
  }

  /**
   * 从模板中提取变量 (优先使用 nunjucks AST 解析)
   * 提供最准确的变量提取和模板验证
   */
  public extractVariables(_template: string): TemplateVariable[] {

    const cacheKey = this.generateCacheKey(_template);
    const cached = this.variableCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let result: TemplateVariable[];
    try {
      result = this.extractVariablesFromAST(_template);
    } catch (_error) {
      Logger.warn('nunjucks AST 解析失败，尝试 nunjucks 编译验证:', _error);

      try {
        result = this.extractVariablesWithNunjucksValidation(_template);
      } catch (fallbackError) {
        Logger.warn('nunjucks 验证失败，回退到正则表达式方法:', fallbackError);
        result = this.extractVariablesWithRegex(_template);
      }
    }


    this.variableCache.set(cacheKey, result);
    return result;
  }

  /**
   * 使用 nunjucks 编译验证 + 正则表达式提取 (备选方法)
   */
  private extractVariablesWithNunjucksValidation(_template: string): TemplateVariable[] {

    try {
      nunjucks.compile(_template, this.env);
    } catch (validationError) {

      Logger.warn(
        '模板语法警告:',
        validationError instanceof Error ? validationError.message : String(validationError)
      );
    }


    const extractedVariables = this.extractVariablesWithRegex(_template);


    return this.enrichVariablesWithNunjucksContext(extractedVariables, _template);
  }

  /**
   * 基于AST解析提取变量
   * 使用nunjucks内部API进行更精确的模板分析
   */
  private extractVariablesFromAST(_template: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const processedNames = new Set<string>();

    try {

      const nunjucksInternal = nunjucks as unknown as NunjucksInternal;
      const parser = nunjucksInternal.parser;
      const nodes = nunjucksInternal.nodes;

      if (!parser || typeof parser.parse !== 'function' || !nodes) {
        throw new Error('nunjucks内部API不可用');
      }


      const ast = parser.parse(_template, [], {});


      this.extractVariablesFromNode(ast, variables, processedNames);


      if (variables.length === 0) {
        throw new Error('AST解析未找到任何变量');
      }


      return variables.map(v => ({
        ...v,
        extractionMethod: 'nunjucks' as const,
        valid: true,
      }));
    } catch (_error) {
      throw new Error(`AST解析失败: ${_error instanceof Error ? _error.message : String(_error)}`);
    }
  }

  /**
   * 从AST节点递归提取变量
   */
  private extractVariablesFromNode(
    node: NunjucksNode,
    variables: TemplateVariable[],
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
            defaultValue: this.getDefaultValue(varName) as TemplateVariableValue,
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
    variables: TemplateVariable[],
    processedNames: Set<string>
  ): void {
    if (node.target?.value && node.val?.value) {
      const fullVarName = `${node.target.value}.${node.val.value}`;
      if (!processedNames.has(fullVarName)) {
        variables.push({
          name: fullVarName,
          type: this.inferVariableType(fullVarName),
          defaultValue: this.getDefaultValue(fullVarName) as TemplateVariableValue,
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
    variables: TemplateVariable[],
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
                defaultValue: this.getDefaultValue(varName) as TemplateVariableValue,
                required: this.isRequiredVariable(varName),
                filters: filterName ? [filterName] : ([] as string[]),
                extractionMethod: 'nunjucks',
              });
              processedNames.add(varName);
            } else if (typeof filterName === 'string') {

              const existingVar = variables.find(v => v.name === varName);
              if (existingVar?.filters && !existingVar.filters.includes(filterName)) {
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
  private extractVariablesWithRegex(_template: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const regex = new RegExp(JINJA2_REGEX.EXPRESSION.source, 'g');
    const conditionRegex = new RegExp(JINJA2_REGEX.IF_CONDITION.source, 'g');
    const processedNames = new Set<string>();

    let match;
    while ((match = regex.exec(_template)) !== null) {
      const expr = match[1].trim();
      const parsed = sharedExtractVariable(expr);

      if (parsed.variableName && !SHARED_JINJA2_KEYWORDS.has(parsed.variableName.toLowerCase()) && !processedNames.has(parsed.variableName)) {
        variables.push({
          name: parsed.variableName,
          type: this.inferVariableType(parsed.variableName),
          defaultValue: this.getDefaultValue(parsed.variableName) as TemplateVariableValue,
          required: this.isRequiredVariable(parsed.variableName),
          filters: parsed.filters,
          extractionMethod: 'regex',
        });
        processedNames.add(parsed.variableName);
      }
    }

    while ((match = conditionRegex.exec(_template)) !== null) {
      const condition = match[2].trim();
      const vars = this.extractVariablesFromExpression(condition);

      vars.forEach(varName => {
        if (!processedNames.has(varName)) {
          variables.push({
            name: varName,
            type: this.inferVariableType(varName),
            defaultValue: this.getDefaultValue(varName) as TemplateVariableValue,
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
    variables: TemplateVariable[],
    _template: string
  ): TemplateVariable[] {

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
      } catch (_error) {

        return {
          ...variable,
          valid: false,
          validationError: _error instanceof Error ? _error.message : String(_error),
          extractionMethod: 'nunjucks' as const,
        };
      }
    });
  }

  /**
   * 为变量创建测试上下文
   */
  private createTestContextForVariable(variable: TemplateVariable): Record<string, unknown> {
    const context: Record<string, unknown> = {};


    switch (variable.type) {
      case 'number':
        context[variable.name] = DEFAULT_VALUES.GENERIC;
        break;
      case 'date':
        context[variable.name] = DEFAULT_VALUES.TODAY_DATE;
        break;
      default:
        context[variable.name] = `${DEFAULT_VALUES.DEMO_PREFIX}${variable.name}`;
    }

    return context;
  }

  /**
   * 从表达式中提取变量名
   */
  private extractVariablesFromExpression(expr: string): string[] {
    const variables: string[] = [];

    if (expr.includes('|')) {
      const { variableName } = sharedExtractVariable(expr);
      if (variableName && !variableName.includes('(') && !SHARED_JINJA2_KEYWORDS.has(variableName.toLowerCase())) {
        variables.push(variableName);
      }
    } else {
      const varRegex = new RegExp(JINJA2_REGEX.IDENTIFIER.source, 'g');
      let match;

      while ((match = varRegex.exec(expr)) !== null) {
        const varName = match[1];
        if (varName.includes('(')) continue;
        if (!SHARED_JINJA2_KEYWORDS.has(varName.toLowerCase())) {
          variables.push(varName);
        }
      }
    }

    return Array.from(new Set(variables));
  }

  /**
   * 推断变量类型 - 增强版本，支持更多类型和上下文
   */
  private inferVariableType(varName: string): 'string' | 'number' | 'date' | 'boolean' {
    const name = varName.toLowerCase();


    if (
      name.startsWith('is_') ||
      name.startsWith('has_') ||
      name.startsWith('can_') ||
      name.startsWith('should_') ||
      name.startsWith('would_') ||
      name.startsWith('could_') ||
      name.startsWith('will_') ||
      name.startsWith('must_') ||
      name.startsWith('do_') ||
      name.startsWith('does_') ||
      name.startsWith('did_') ||
      name.includes('enabled') ||
      name.includes('disabled') ||
      name.includes('active') ||
      name.includes('inactive') ||
      name.includes('deleted') ||
      name.includes('include') ||
      name.includes('exclude') ||
      name.includes('show') ||
      name.includes('hide') ||
      name.includes('visible') ||
      name.includes('available') ||
      name.includes('valid') ||
      name.includes('required') ||
      name.includes('optional') ||
      name.includes('is_trial_user') ||
      name.includes('is_active')
    ) {
      return 'boolean';
    }


    if (
      name.includes('_id') && !name.includes('uuid') ||
      name.endsWith('_id') ||
      name.endsWith('_num') ||
      name.endsWith('_count') ||
      name.endsWith('_amount') ||
      name.endsWith('_price') ||
      name.endsWith('_cost') ||
      name.endsWith('_total') ||
      name.endsWith('_quantity') ||
      name.endsWith('_size') ||
      name.endsWith('_length') ||
      name.endsWith('_width') ||
      name.endsWith('_height') ||
      name.endsWith('_weight') ||
      name.includes('count') ||
      name.includes('amount') ||
      name.includes('price') ||
      name.includes('cost') ||
      name.includes('total') ||
      name.includes('quantity') ||
      name.includes('size') ||
      name.includes('length') ||
      name.includes('width') ||
      name.includes('height') ||
      name.includes('weight') ||
      name.includes('age') ||
      name.includes('score') ||
      name.includes('rating') ||
      name.includes('level') ||
      name.includes('index') ||
      name.includes('position') ||
      name.includes('order') ||
      name.includes('rank') ||
      name.includes('num')
    ) {
      return 'number';
    }


    if (
      name.includes('date') ||
      name.includes('time') ||
      name.includes('created') ||
      name.includes('updated') ||
      name.includes('modified') ||
      name.includes('deleted') ||
      name.includes('timestamp') ||
      name.includes('birth') ||
      name.includes('start_') ||
      name.includes('end_') ||
      name.includes('expires') ||
      name.includes('due') ||
      name.includes('scheduled') ||
      name.includes('published') ||
      name.includes('posted') ||
      name.includes('registered') ||
      name.includes('last_') ||
      name.includes('first_') ||
      name.includes('current_') ||
      name.endsWith('_at') ||
      name.endsWith('_on') ||
      name.endsWith('_date') ||
      name.endsWith('_time')
    ) {
      return 'date';
    }


    return 'string';
  }

  /**
   * 获取变量的默认值 - 智能默认值生成
   */
  private getDefaultValue(varName: string): unknown {
    const type = this.inferVariableType(varName);
    const name = varName.toLowerCase();

    switch (type) {
      case 'number':


        if (name.endsWith(NUMBER_PATTERNS.ID_SUFFIX) || (name.includes(NUMBER_PATTERNS.ID_SUFFIX) && !name.includes('uuid'))) {
          return DEFAULT_VALUES.ID;
        } else if (NUMBER_PATTERNS.QUANTITY_SUFFIXES.some(suffix => name.endsWith(suffix))) {
          return DEFAULT_VALUES.COUNT;
        } else if (NUMBER_PATTERNS.QUANTITY_SUFFIXES.some(keyword => name.includes(keyword))) {
          return DEFAULT_VALUES.COUNT;
        } else if (NUMBER_PATTERNS.FINANCIAL_KEYWORDS.some(keyword => name.includes(keyword))) {
          return DEFAULT_VALUES.PRICE_COST;
        } else if (name.endsWith('_size') || NUMBER_PATTERNS.SIZE_KEYWORDS.some(keyword => name.includes(keyword))) {
          return DEFAULT_VALUES.SIZE_DIMENSION;
        } else if (NUMBER_PATTERNS.AGE_PATTERNS.some(pattern => name === pattern || name.endsWith(pattern))) {
          return DEFAULT_VALUES.AGE;
        } else if (NUMBER_PATTERNS.SCORING_KEYWORDS.some(keyword => name.includes(keyword))) {
          return DEFAULT_VALUES.SCORE_RATING;
        } else if (NUMBER_PATTERNS.LEVEL_KEYWORDS.some(keyword => name.includes(keyword))) {
          return DEFAULT_VALUES.LEVEL_INDEX;
        } else {
          return DEFAULT_VALUES.GENERIC;
        }

      case 'date':

        const today = DEFAULT_VALUES.TODAY_DATE;
        if (DATE_PATTERNS.KEY_DATES.CREATION.some(keyword => name.includes(keyword))) {
          return today;
        } else if (DATE_PATTERNS.KEY_DATES.START.some(keyword => name.includes(keyword))) {
          return today;
        } else if (DATE_PATTERNS.KEY_DATES.END.some(keyword => name.includes(keyword))) {

          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + DEFAULT_VALUES.FUTURE_DATE_OFFSET_DAYS);
          return futureDate.toISOString().split('T')[0];
        } else if (DATE_PATTERNS.KEY_DATES.BIRTH.some(keyword => name.includes(keyword))) {
          return DEFAULT_VALUES.BIRTH_DATE;
        } else {
          return today;
        }

      case 'boolean':

        if (BOOLEAN_PATTERNS.NEGATIVE.some(negative => name.includes(negative))) {
          return false;
        } else if (BOOLEAN_PATTERNS.POSITIVE.some(positive => name.includes(positive))) {
          return true;
        } else if (BOOLEAN_PATTERNS.AFFIRMATIVE_PREFIXES.some(prefix => name.startsWith(prefix))) {
          return true;
        } else if (name.startsWith('is_')) {

          if (BOOLEAN_PATTERNS.NEGATIVE_PREFIXES.some(negative => name.includes(negative))) {
            return false;
          } else {
            return true;
          }
        } else {
          return true;
        }

      default:

        if (name.includes(STRING_PATTERNS.NAME)) {
          return STRING_DEFAULTS.EXAMPLE_NAME;
        } else if (name.includes(STRING_PATTERNS.TITLE)) {
          return STRING_DEFAULTS.EXAMPLE_TITLE;
        } else if (name.includes(STRING_PATTERNS.DESCRIPTION)) {
          return STRING_DEFAULTS.EXAMPLE_DESCRIPTION;
        } else if (name.includes(STRING_PATTERNS.PHONE)) {
          return DEFAULT_VALUES.PHONE;
        } else if (name.includes(STRING_PATTERNS.ADDRESS)) {
          return STRING_DEFAULTS.EXAMPLE_ADDRESS;
        } else if (STRING_PATTERNS.CATEGORY_TYPE.some(pattern => name.includes(pattern))) {
          return STRING_DEFAULTS.DEFAULT_CATEGORY;
        } else if (name.includes(STRING_PATTERNS.STATUS)) {
          return STRING_DEFAULTS.DEFAULT_STATUS;
        } else {
          return `${DEFAULT_VALUES.DEMO_PREFIX}${varName}`;
        }
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
  public generateDemoSQL(_template: string): { sql: string; variables: TemplateVariable[] } {
    const variables = this.extractVariables(_template);
    const context: Record<string, unknown> = {};


    variables.forEach(variable => {
      context[variable.name] = variable.defaultValue;
    });


    const sql = this.renderTemplate(_template, context);

    return { sql, variables };
  }

  /**
   * 使用自定义变量渲染模板
   */
  public renderWithCustomVariables(_template: string, variables: Record<string, unknown>): string {
    return this.renderTemplate(_template, variables);
  }

  /**
   * 验证模板语法
   */
  /**
   * Generate cache key for template
   */
  private generateCacheKey(template: string): string {

    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `template_${Math.abs(hash)}`;
  }

  public validateTemplate(_template: string): { valid: boolean; errors: string[] } {

    const cacheKey = `validate_${this.generateCacheKey(_template)}`;
    const cached = this.templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const errors: string[] = [];

    try {

      if (!_template.includes('{{') && !_template.includes('{%')) {
        const result = { valid: true, errors: [] };
        this.templateCache.set(cacheKey, result);
        return result;
      }


      nunjucks.compile(_template, this.env);

      const result = { valid: true, errors: [] };
      this.templateCache.set(cacheKey, result);
      return result;
    } catch (_error) {
      errors.push(`Syntax error: ${_error instanceof Error ? _error.message : String(_error)}`);
      const result = { valid: false, errors };
      this.templateCache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * 获取模板预览
   */
  public getTemplatePreview(_template: string, maxLength: number = PROCESSING_CONFIG.DEFAULT_TEMPLATE_PREVIEW_LENGTH): string {
    let preview = _template.replace(/\{\{\s*([^}]+)\s*\}\}/g, '{{$1}}');
    preview = preview.replace(/\{%\s*([^%]+)\s*%}/g, '{%$1%}');

    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength) + '...';
    }

    return preview;
  }

  /**
   * 获取支持的过滤器列表
   */
  public getSupportedFilters(): string[] {
    return [

      'sql_quote',
      'sql_identifier',
      'identifier',
      // jinja2sql 对齐：标识符 / 参数绑定 / IN 子句 / 原样输出
      'bind',
      'inclause',
      'safe',
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
      '测试表达式 ({% if x is divisibleby(3) %})',
      '集合操作',
      '自定义过滤器和函数',
    ];
  }

  /**
   * Get cache metrics for performance monitoring
   */
  public getCacheMetrics() {
    return {
      variableCache: this.variableCache.getMetrics(),
      templateCache: this.templateCache.getMetrics(),
    };
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.variableCache.clear();
    this.templateCache.clear();
  }

  /**
   * Clear variable cache only
   */
  public clearVariableCache(): void {
    this.variableCache.clear();
  }

  /**
   * Clear template cache only
   */
  public clearTemplateCache(): void {
    this.templateCache.clear();
  }
}
