/**
 * Python风格的Jinja2条件语句处理器
 * 实现空值过滤（移除if块）和真值保留（保留if块）的逻辑
 */

export interface ConditionContext {
  variables: Record<string, any>;
  variableTypes: Map<string, string>;
  templateContext: string;
}

export interface ConditionalBlock {
  condition: string;
  content: string;
  startIndex: number;
  endIndex: number;
  hasElse: boolean;
  elseContent?: string;
  hasElif: boolean;
  elifBlocks?: Array<{ condition: string; content: string }>;
}

export interface ProcessingResult {
  processedTemplate: string;
  removedBlocks: ConditionalBlock[];
  keptBlocks: ConditionalBlock[];
  decisions: Array<{ condition: string; decision: 'keep' | 'remove'; reason: string }>;
}

/**
 * Python风格的条件语句处理器
 * 模拟Python的真值测试和空值检查逻辑
 */
export class Jinja2ConditionProcessor {
  private static readonly PYTHON_TRUTHY_VALUES = new Set([
    true,
    1,
    1.0,
    '1',
    'true',
    'True',
    'TRUE',
    'yes',
    'Yes',
    'YES',
    'on',
    'On',
    'ON',
  ]);

  private static readonly PYTHON_FALSY_VALUES = new Set([
    false,
    0,
    0.0,
    '',
    '0',
    'false',
    'False',
    'FALSE',
    'no',
    'No',
    'NO',
    'off',
    'Off',
    'OFF',
    null,
    undefined,
  ]);

  private static readonly EMPTY_PATTERNS = [
    /^\s*$/,
    /^\s*null\s*$/i,
    /^\s*undefined\s*$/i,
    /^\s*none\s*$/i,
    /^\s*nil\s*$/i,
    /^\[\s*\]$/, // Empty array
    /^\{\s*\}$/, // Empty object
    /^\(\s*\)$/, // Empty tuple
    /^""$/, // Empty string
    /^''$/, // Empty string
  ];

  /**
   * 处理Jinja2模板中的条件语句
   */
  public static processConditions(template: string, context: ConditionContext): ProcessingResult {
    const conditionalBlocks = this.extractConditionalBlocks(template);
    const result: ProcessingResult = {
      processedTemplate: template,
      removedBlocks: [],
      keptBlocks: [],
      decisions: [],
    };

    // 从后往前处理，避免索引变化的问题
    const sortedBlocks = conditionalBlocks.sort((a, b) => b.startIndex - a.startIndex);

    for (const block of sortedBlocks) {
      const decision = this.evaluateCondition(block.condition, context);

      result.decisions.push({
        condition: block.condition,
        decision: decision.action,
        reason: decision.reason,
      });

      if (decision.action === 'remove') {
        result.removedBlocks.push(block);
        // 移除整个条件块
        const before = result.processedTemplate.substring(0, block.startIndex);
        const after = result.processedTemplate.substring(block.endIndex + 1);
        result.processedTemplate = before + after;
      } else {
        result.keptBlocks.push(block);
        // 保留条件内容，但移除条件标签
        const content = this.extractContentWithoutConditionals(block, decision);
        const before = result.processedTemplate.substring(0, block.startIndex);
        const after = result.processedTemplate.substring(block.endIndex + 1);
        result.processedTemplate = before + content + after;
      }
    }

    return result;
  }

  /**
   * 提取条件块
   */
  private static extractConditionalBlocks(template: string): ConditionalBlock[] {
    const blocks: ConditionalBlock[] = [];
    const lines = template.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ifMatch = line.match(/\{%\s*if\s+(.+?)\s*%\}/);

      if (ifMatch) {
        const block = this.parseConditionalBlock(lines, i, ifMatch[1]);
        if (block) {
          blocks.push(block);
          i = block.endIndex; // 跳过已处理的块
        }
      }
    }

    return blocks;
  }

  /**
   * 解析单个条件块
   */
  private static parseConditionalBlock(
    lines: string[],
    startIndex: number,
    condition: string
  ): ConditionalBlock | null {
    const block: ConditionalBlock = {
      condition: condition.trim(),
      content: '',
      startIndex,
      endIndex: startIndex,
      hasElse: false,
      hasElif: false,
    };

    let currentLine = startIndex + 1;
    let nestingLevel = 0;
    let contentStart = currentLine;
    let contentEnd = currentLine;

    const elifBlocks: Array<{ condition: string; content: string }> = [];
    let elseStart = -1;

    while (currentLine < lines.length) {
      const line = lines[currentLine];

      if (line.includes('{% if')) {
        nestingLevel++;
      } else if (line.includes('{% endif')) {
        if (nestingLevel === 0) {
          block.endIndex = currentLine;
          break;
        } else {
          nestingLevel--;
        }
      } else if (nestingLevel === 0) {
        if (line.includes('{% else')) {
          block.hasElse = true;
          elseStart = currentLine;
          contentEnd = currentLine - 1;
        } else if (line.includes('{% elif')) {
          const elifMatch = line.match(/\{%\s*elif\s+(.+?)\s*%\}/);
          if (elifMatch) {
            block.hasElif = true;
            if (elseStart === -1) {
              contentEnd = currentLine - 1;
            }
            elifBlocks.push({
              condition: elifMatch[1].trim(),
              content: '',
            });
          }
        }
      }

      currentLine++;
    }

    // 提取主内容
    if (contentEnd >= contentStart) {
      block.content = lines.slice(contentStart, contentEnd + 1).join('\n');
    }

    // 提取elif内容
    for (let i = 0; i < elifBlocks.length; i++) {
      const elifBlock = elifBlocks[i];
      const elifStart = this.findLineIndex(lines, elifBlock.condition, currentLine);
      if (elifStart !== -1) {
        const elifEnd =
          i < elifBlocks.length - 1
            ? this.findLineIndex(lines, elifBlocks[i + 1].condition, elifStart)
            : elseStart !== -1
              ? elseStart
              : block.endIndex;

        if (elifEnd !== -1) {
          elifBlock.content = lines.slice(elifStart + 1, elifEnd).join('\n');
        }
      }
    }

    // 提取else内容
    if (elseStart !== -1 && block.endIndex > elseStart) {
      block.elseContent = lines.slice(elseStart + 1, block.endIndex).join('\n');
    }

    block.elifBlocks = elifBlocks.length > 0 ? elifBlocks : undefined;
    return block;
  }

  /**
   * 查找包含特定条件的行
   */
  private static findLineIndex(lines: string[], condition: string, startIndex: number): number {
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].includes(condition)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 评估条件
   */
  private static evaluateCondition(
    condition: string,
    context: ConditionContext
  ): { action: 'keep' | 'remove'; reason: string } {
    try {
      // 解析条件
      const parsedCondition = this.parseConditionExpression(condition);

      // 检查变量是否存在
      const variableCheck = this.checkVariablesExist(parsedCondition, context);
      if (!variableCheck.exists) {
        return {
          action: 'remove',
          reason: `变量 ${variableCheck.missingVariable} 不存在，移除条件块`,
        };
      }

      // 评估条件逻辑
      const evaluation = this.evaluateExpression(parsedCondition, context);

      if (evaluation.value) {
        return {
          action: 'keep',
          reason: `条件为真，保留条件块 (${evaluation.details})`,
        };
      } else {
        return {
          action: 'remove',
          reason: `条件为假，移除条件块 (${evaluation.details})`,
        };
      }
    } catch (error) {
      // 解析失败，保守起见保留
      return {
        action: 'keep',
        reason: `条件解析失败，保守保留 (${error})`,
      };
    }
  }

  /**
   * 解析条件表达式
   */
  private static parseConditionExpression(condition: string): any {
    // 简单的条件解析器
    const trimmed = condition.trim();

    // 检查是否为空值检查
    if (trimmed.includes('is not None') || trimmed.includes('is not null')) {
      return {
        type: 'existence_check',
        variable: trimmed.replace(/\s+(is not None|is not null)/i, ''),
        operator: 'exists',
      };
    }

    if (trimmed.includes('is None') || trimmed.includes('is null')) {
      return {
        type: 'existence_check',
        variable: trimmed.replace(/\s+(is None|is null)/i, ''),
        operator: 'not_exists',
      };
    }

    // 检查比较操作
    const comparisonMatch = trimmed.match(/^([^=<>!]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      return {
        type: 'comparison',
        left: comparisonMatch[1].trim(),
        operator: comparisonMatch[2],
        right: comparisonMatch[3].trim(),
      };
    }

    // 检查成员检查
    const membershipMatch = trimmed.match(/^([^]+)\s+(in|not in)\s+(.+)$/);
    if (membershipMatch) {
      return {
        type: 'membership',
        variable: membershipMatch[1].trim(),
        operator: membershipMatch[2],
        target: membershipMatch[3].trim(),
      };
    }

    // 检查逻辑操作
    if (trimmed.includes(' and ') || trimmed.includes(' or ')) {
      const parts = trimmed.split(/\s+(and|or)\s+/);
      const operators = trimmed.match(/\s+(and|or)\s+/g) || [];

      return {
        type: 'logical',
        operands: parts.map(p => this.parseConditionExpression(p.trim())),
        operators: operators.map(o => o.trim()),
      };
    }

    // 默认作为变量存在性检查
    return {
      type: 'variable_check',
      variable: trimmed,
      operator: 'truthy',
    };
  }

  /**
   * 检查变量是否存在
   */
  private static checkVariablesExist(
    parsedCondition: any,
    context: ConditionContext
  ): { exists: boolean; missingVariable?: string } {
    if (parsedCondition.type === 'variable_check') {
      return {
        exists: context.variables.hasOwnProperty(parsedCondition.variable),
        missingVariable: context.variables.hasOwnProperty(parsedCondition.variable)
          ? undefined
          : parsedCondition.variable,
      };
    }

    if (parsedCondition.type === 'comparison') {
      const leftExists = context.variables.hasOwnProperty(parsedCondition.left);
      if (!leftExists) {
        return { exists: false, missingVariable: parsedCondition.left };
      }
      return { exists: true };
    }

    if (parsedCondition.type === 'existence_check') {
      return {
        exists: context.variables.hasOwnProperty(parsedCondition.variable),
        missingVariable: context.variables.hasOwnProperty(parsedCondition.variable)
          ? undefined
          : parsedCondition.variable,
      };
    }

    if (parsedCondition.type === 'logical') {
      for (const operand of parsedCondition.operands) {
        const check = this.checkVariablesExist(operand, context);
        if (!check.exists) {
          return check;
        }
      }
      return { exists: true };
    }

    return { exists: true };
  }

  /**
   * 评估表达式
   */
  private static evaluateExpression(
    parsedCondition: any,
    context: ConditionContext
  ): { value: boolean; details: string } {
    switch (parsedCondition.type) {
      case 'variable_check':
        return this.evaluateVariableCheck(parsedCondition.variable, context);

      case 'existence_check':
        return this.evaluateExistenceCheck(parsedCondition, context);

      case 'comparison':
        return this.evaluateComparison(parsedCondition, context);

      case 'membership':
        return this.evaluateMembership(parsedCondition, context);

      case 'logical':
        return this.evaluateLogical(parsedCondition, context);

      default:
        return { value: false, details: '未知的条件类型' };
    }
  }

  /**
   * 评估变量检查
   */
  private static evaluateVariableCheck(
    variable: string,
    context: ConditionContext
  ): { value: boolean; details: string } {
    const value = context.variables[variable];

    if (value === undefined || value === null) {
      return { value: false, details: `${variable} 为 ${value}` };
    }

    const isTruthy = this.isPythonTruthy(value);
    return {
      value: isTruthy,
      details: `${variable} = ${value} (${isTruthy ? '真值' : '假值'})`,
    };
  }

  /**
   * 评估存在性检查
   */
  private static evaluateExistenceCheck(
    parsedCondition: any,
    context: ConditionContext
  ): { value: boolean; details: string } {
    const variable = parsedCondition.variable;
    const value = context.variables[variable];

    const exists = value !== undefined && value !== null;

    if (parsedCondition.operator === 'exists') {
      return {
        value: exists,
        details: `${variable} ${exists ? '存在' : '不存在'}`,
      };
    } else {
      return {
        value: !exists,
        details: `${variable} ${!exists ? '不存在' : '存在'}`,
      };
    }
  }

  /**
   * 评估比较
   */
  private static evaluateComparison(
    parsedCondition: any,
    context: ConditionContext
  ): { value: boolean; details: string } {
    const leftValue = context.variables[parsedCondition.left];
    const rightValue = this.parseValue(parsedCondition.right, context);

    const comparison = this.compareValues(leftValue, rightValue, parsedCondition.operator);

    return {
      value: comparison,
      details: `${leftValue} ${parsedCondition.operator} ${rightValue} = ${comparison}`,
    };
  }

  /**
   * 评估成员检查
   */
  private static evaluateMembership(
    parsedCondition: any,
    context: ConditionContext
  ): { value: boolean; details: string } {
    const variable = context.variables[parsedCondition.variable];
    const target = this.parseValue(parsedCondition.target, context);

    if (Array.isArray(target)) {
      const result = target.includes(variable);
      return {
        value: parsedCondition.operator === 'in' ? result : !result,
        details: `${variable} ${parsedCondition.operator} [${target.join(', ')}] = ${result}`,
      };
    }

    if (typeof target === 'string') {
      const result = target.includes(String(variable));
      return {
        value: parsedCondition.operator === 'in' ? result : !result,
        details: `${variable} ${parsedCondition.operator} "${target}" = ${result}`,
      };
    }

    return { value: false, details: '无法评估成员检查' };
  }

  /**
   * 评估逻辑操作
   */
  private static evaluateLogical(
    parsedCondition: any,
    context: ConditionContext
  ): { value: boolean; details: string } {
    const results = parsedCondition.operands.map((operand: any) =>
      this.evaluateExpression(operand, context)
    );

    let result = results[0].value;
    let details = [results[0].details];

    for (let i = 0; i < parsedCondition.operators.length; i++) {
      const operator = parsedCondition.operators[i];
      const nextResult = results[i + 1];

      if (operator === 'and') {
        result = result && nextResult.value;
      } else if (operator === 'or') {
        result = result || nextResult.value;
      }

      details.push(`${operator} ${nextResult.details}`);
    }

    return {
      value: result,
      details: `(${details.join(' ')}) = ${result}`,
    };
  }

  /**
   * 比较值
   */
  private static compareValues(left: any, right: any, operator: string): boolean {
    switch (operator) {
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return Number(left) > Number(right);
      case '<':
        return Number(left) < Number(right);
      case '>=':
        return Number(left) >= Number(right);
      case '<=':
        return Number(left) <= Number(right);
      default:
        return false;
    }
  }

  /**
   * 解析值
   */
  private static parseValue(value: string, context: ConditionContext): any {
    // 移除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // 检查是否为数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // 检查是否为布尔值
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }

    // 检查是否为null
    if (value.toLowerCase() === 'null' || value.toLowerCase() === 'none') {
      return null;
    }

    // 作为变量处理
    return context.variables[value] || value;
  }

  /**
   * Python风格真值检查
   */
  private static isPythonTruthy(value: any): boolean {
    // 检查明确的假值
    if (this.PYTHON_FALSY_VALUES.has(value)) {
      return false;
    }

    // 检查空字符串
    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }

    // 检查空数组
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }

    // 检查空对象
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
      return false;
    }

    // 检查NaN
    if (typeof value === 'number' && isNaN(value)) {
      return false;
    }

    // 其他情况为真
    return true;
  }

  /**
   * 提取内容（移除条件标签）
   */
  private static extractContentWithoutConditionals(
    block: ConditionalBlock,
    decision: { action: 'keep' | 'remove'; reason: string }
  ): string {
    if (decision.action === 'remove') {
      return '';
    }

    // 对于keep操作，我们需要决定保留哪个分支
    if (block.hasElif) {
      // 复杂的elif逻辑，这里简化处理，保留第一个条件分支
      return block.content;
    }

    if (block.hasElse) {
      // 保留if分支（因为我们已经判断为真）
      return block.content;
    }

    return block.content;
  }

  /**
   * 获取Python风格的真值测试规则
   */
  public static getTruthyTestRules(): string[] {
    return [
      'False值：false, 0, 0.0, "", [], {}, (), None',
      'True值：非空字符串，非零数字，非空容器，非None对象',
      '空值检查：variable is None → 检查是否为None',
      '非空检查：variable is not None → 检查是否不为None',
      '存在性检查：if variable → 相当于if variable is not None',
      '比较操作：==, !=, >, <, >=, <=',
      '成员检查：in, not in',
      '逻辑操作：and, or, not',
    ];
  }
}
