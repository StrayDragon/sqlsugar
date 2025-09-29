/**
 * SQLAlchemy占位符处理器
 * 支持:value形式的占位符与Jinja2模板的混合使用
 */

/**
 * SQLAlchemy占位符值的类型
 */
export type SQLAlchemyValue = string | number | boolean | Date | SQLAlchemyValue[] | null | undefined;

/**
 * SQLAlchemy上下文类型
 */
export type SQLAlchemyContext = Record<string, SQLAlchemyValue>;
export class SQLAlchemyPlaceholderProcessor {
  /**
   * 检测SQL字符串中的占位符类型
   */
  public static detectPlaceholderTypes(sql: string): {
    hasJinja2: boolean;
    hasSQLAlchemy: boolean;
    jinja2Vars: string[];
    sqlalchemyVars: string[];
  } {
    const jinja2Regex = /\{\{\s*([^}]+)\s*\}\}/g;
    const sqlalchemyRegex = /:(\w+)\b/g;

    const jinja2Vars: string[] = [];
    const sqlalchemyVars: string[] = [];

    let match;

    // 提取Jinja2变量
    while ((match = jinja2Regex.exec(sql)) !== null) {
      const expr = match[1].trim();
      const vars = this.extractVariablesFromExpression(expr);
      jinja2Vars.push(...vars);
    }

    // 提取SQLAlchemy占位符
    while ((match = sqlalchemyRegex.exec(sql)) !== null) {
      sqlalchemyVars.push(match[1]);
    }

    return {
      hasJinja2: jinja2Vars.length > 0,
      hasSQLAlchemy: sqlalchemyVars.length > 0,
      jinja2Vars: Array.from(new Set(jinja2Vars)),
      sqlalchemyVars: Array.from(new Set(sqlalchemyVars)),
    };
  }

  /**
   * 从表达式中提取变量名
   */
  private static extractVariablesFromExpression(expr: string): string[] {
    const variables: string[] = [];
    const varRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)/g;
    let match;

    while ((match = varRegex.exec(expr)) !== null) {
      const varName = match[1];
      const excludedWords = [
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
      if (!excludedWords.includes(varName.toLowerCase()) && !varName.includes('(')) {
        variables.push(varName);
      }
    }

    return Array.from(new Set(variables));
  }

  /**
   * 转换混合占位符为统一的格式
   */
  public static convertMixedPlaceholders(
    sql: string,
    context: SQLAlchemyContext
  ): {
    convertedSQL: string;
    usedPlaceholders: string[];
    placeholderMap: SQLAlchemyContext;
  } {
    const detection = this.detectPlaceholderTypes(sql);
    const usedPlaceholders: string[] = [];
    const placeholderMap: SQLAlchemyContext = {};

    // 如果没有SQLAlchemy占位符，直接返回
    if (!detection.hasSQLAlchemy) {
      return {
        convertedSQL: sql,
        usedPlaceholders: [],
        placeholderMap: {},
      };
    }

    // 处理SQLAlchemy占位符
    let convertedSQL = sql;
    const sqlalchemyRegex = /:(\w+)\b/g;

    convertedSQL = convertedSQL.replace(sqlalchemyRegex, (match, placeholder) => {
      // 检查是否有对应的值
      if (context[placeholder] !== undefined) {
        usedPlaceholders.push(placeholder);
        placeholderMap[placeholder] = context[placeholder];

        // 根据值类型格式化SQL字面量
        return this.formatSQLValue(context[placeholder]);
      }

      // 如果没有提供值，保持原样
      return match;
    });

    return {
      convertedSQL,
      usedPlaceholders: Array.from(new Set(usedPlaceholders)),
      placeholderMap,
    };
  }

  /**
   * 格式化值为SQL字面量
   */
  private static formatSQLValue(value: SQLAlchemyValue): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      // 转义单引号
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (value instanceof Date) {
      return `'${value.toISOString().replace('T', ' ').replace('Z', '')}'`;
    }

    if (Array.isArray(value)) {
      return value.map(v => this.formatSQLValue(v)).join(', ');
    }

    // 其他类型转换为字符串
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * 生成混合模板的预览
   */
  public static generatePreview(
    originalSQL: string,
    jinja2Context: Record<string, unknown>,
    sqlalchemyContext: SQLAlchemyContext
  ): string {
    const detection = this.detectPlaceholderTypes(originalSQL);

    let preview = originalSQL;

    if (detection.hasSQLAlchemy) {
      const conversion = this.convertMixedPlaceholders(originalSQL, sqlalchemyContext);
      preview = conversion.convertedSQL;
    }

    return preview;
  }

  /**
   * 验证混合占位符语法
   */
  public static validateMixedPlaceholders(sql: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const detection = this.detectPlaceholderTypes(sql);

    // 检查Jinja2语法
    if (detection.hasJinja2) {
      try {
        // 简单的括号匹配检查
        const openJinja2 = (sql.match(/\{\{/g) || []).length;
        const closeJinja2 = (sql.match(/\}\}/g) || []).length;
        const openControl = (sql.match(/\{%/g) || []).length;
        const closeControl = (sql.match(/%\}/g) || []).length;

        if (openJinja2 !== closeJinja2) {
          errors.push('Unclosed Jinja2 variable expressions');
        }
        if (openControl !== closeControl) {
          errors.push('Unclosed Jinja2 control blocks');
        }
      } catch (error) {
        errors.push(
          `Jinja2 syntax error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // 检查SQLAlchemy占位符
    if (detection.hasSQLAlchemy) {
      const invalidPlaceholders = detection.sqlalchemyVars.filter(
        variable => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)
      );

      if (invalidPlaceholders.length > 0) {
        warnings.push(`Invalid SQLAlchemy placeholder names: ${invalidPlaceholders.join(', ')}`);
      }
    }

    // 检查潜在的冲突
    const conflictingVars = detection.jinja2Vars.filter(variable =>
      detection.sqlalchemyVars.includes(variable)
    );

    if (conflictingVars.length > 0) {
      warnings.push(
        `Variable names used in both Jinja2 and SQLAlchemy: ${conflictingVars.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 提取所有需要的变量（混合类型）
   */
  public static extractAllVariables(sql: string): {
    jinja2Vars: string[];
    sqlalchemyVars: string[];
    allVars: string[];
  } {
    const detection = this.detectPlaceholderTypes(sql);
    const allVars = Array.from(new Set(detection.jinja2Vars.concat(detection.sqlalchemyVars)));

    return {
      jinja2Vars: detection.jinja2Vars,
      sqlalchemyVars: detection.sqlalchemyVars,
      allVars,
    };
  }

  /**
   * 获取占位符使用统计
   */
  public static getPlaceholderStats(sql: string): {
    jinja2Count: number;
    sqlalchemyCount: number;
    totalPlaceholders: number;
    complexity: 'simple' | 'medium' | 'complex';
  } {
    const detection = this.detectPlaceholderTypes(sql);

    const jinja2Count = (sql.match(/\{\{\s*[^}]+\s*\}\}/g) || []).length;
    const sqlalchemyCount = (sql.match(/:\w+\b/g) || []).length;
    const totalPlaceholders = jinja2Count + sqlalchemyCount;

    let complexity: 'simple' | 'medium' | 'complex' = 'simple';

    if (detection.hasJinja2 && detection.hasSQLAlchemy) {
      complexity = 'complex';
    } else if (totalPlaceholders > 3) {
      complexity = 'medium';
    }

    return {
      jinja2Count,
      sqlalchemyCount,
      totalPlaceholders,
      complexity,
    };
  }
}
