import * as vscode from 'vscode';

export interface Jinja2Variable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'null' | 'unknown';
    defaultValue?: any;
    description?: string;
}

export interface Jinja2TemplateAnalysis {
    hasJinja2Syntax: boolean;
    variables: Jinja2Variable[];
    templateSQL: string;
    demoSQL: string;
}

export interface DemoDataGenerationOptions {
    stringSamples?: string[];
    numberRange?: [number, number];
    booleanValues?: boolean[];
    includeNull?: boolean;
}

/**
 * Jinja2模板解析器和演示SQL生成器
 */
export class Jinja2TemplateProcessor {
    // 默认演示数据选项
    private static readonly DEFAULT_OPTIONS: DemoDataGenerationOptions = {
        stringSamples: ['demo_string', 'example_value', 'test_data', 'sample_text'],
        numberRange: [1, 100],
        booleanValues: [true, false],
        includeNull: true
    };

    // Jinja2语法模式
    private static readonly JINJA2_PATTERNS = {
        // 变量表达式 {{ variable }}
        VARIABLE_EXP: /\{\{\s*([^}]+?)\s*\}\}/g,
        // 条件语句 {% if condition %}
        CONDITIONAL: /\{%\s*(if|elif|else|endif)\s+([^%]+?)\s*%\}/g,
        // 循环语句 {% for item in items %}
        LOOP: /\{%\s*(for|endfor)\s+([^%]+?)\s*%\}/g,
        // 注释 {# comment #}
        COMMENT: /\{#.*?#\}/g,
        // 过滤器 | filter
        FILTER: /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)/g
    };

    // SQL关键词检测（用于忽略包含SQL关键词的Jinja2变量）
    private static readonly SQL_KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'GROUP BY', 'ORDER BY',
        'HAVING', 'LIMIT', 'UNION', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
        'IS', 'NULL', 'TRUE', 'FALSE', 'CREATE', 'TABLE', 'INDEX', 'DROP', 'ALTER'
    ];

    /**
     * 分析选中的文本是否为Jinja2模板SQL
     */
    public static analyzeTemplate(selectedText: string): Jinja2TemplateAnalysis | null {
        if (!selectedText || !selectedText.trim()) {
            return null;
        }

        // 去除引号
        const raw = selectedText.trim();
        const unquoted = this.stripQuotes(raw);

        // 检查是否包含Jinja2语法
        const hasJinja2Syntax = this.detectJinja2Syntax(unquoted);
        if (!hasJinja2Syntax) {
            return null;
        }

        // 检查是否像SQL语句（基础验证）
        if (!this.looksLikeSQL(unquoted)) {
            return null;
        }

        // 提取变量
        const variables = this.extractVariables(unquoted);

        // 生成演示SQL
        const demoSQL = this.generateDemoSQL(unquoted, variables);

        return {
            hasJinja2Syntax: true,
            variables,
            templateSQL: unquoted,
            demoSQL
        };
    }

    /**
     * 去除字符串引号
     */
    private static stripQuotes(text: string): string {
        const t = text.trim();

        // 处理带前缀的字符串 (f"...", r"""...""")
        const prefixMatch = t.match(/^([fruFRU]*)(['"]{1,3})(.*?)(['"]{1,3})$/s);
        if (prefixMatch) {
            const [, , openQuote, content, closeQuote] = prefixMatch;
            if (openQuote === closeQuote) {
                return content;
            }
        }

        // 三引号 ''' or """
        if ((t.startsWith("'''") && t.endsWith("'''")) || (t.startsWith('"""') && t.endsWith('"""'))) {
            return t.slice(3, -3);
        }
        // 单引号或双引号
        if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
            return t.slice(1, -1);
        }
        return t;
    }

    /**
     * 检测Jinja2语法
     */
    private static detectJinja2Syntax(text: string): boolean {
        // 检查变量表达式
        const variableMatches = text.match(this.JINJA2_PATTERNS.VARIABLE_EXP);
        if (variableMatches && variableMatches.length > 0) {
            return true;
        }

        // 检查控制结构
        const conditionalMatches = text.match(this.JINJA2_PATTERNS.CONDITIONAL);
        if (conditionalMatches && conditionalMatches.length > 0) {
            return true;
        }

        const loopMatches = text.match(this.JINJA2_PATTERNS.LOOP);
        if (loopMatches && loopMatches.length > 0) {
            return true;
        }

        return false;
    }

    /**
     * 检查是否像SQL语句
     */
    private static looksLikeSQL(text: string): boolean {
        const s = text.trim().toUpperCase();
        const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'WITH'];
        return keywords.some(k => s.includes(k));
    }

    /**
     * 提取Jinja2变量
     */
    private static extractVariables(text: string): Jinja2Variable[] {
        const variables: Jinja2Variable[] = [];
        const variableMap = new Map<string, Jinja2Variable>();

        // 移除注释
        const cleanedText = text.replace(this.JINJA2_PATTERNS.COMMENT, '');

        // 查找所有变量表达式
        let match;
        const variableExp = this.JINJA2_PATTERNS.VARIABLE_EXP;
        const regex = new RegExp(variableExp);

        while ((match = regex.exec(cleanedText)) !== null) {
            const expression = match[1].trim();

            // 解析变量名（忽略过滤器等复杂表达式）
            const varName = this.parseVariableName(expression);
            if (varName && !this.shouldIgnoreVariable(varName)) {
                if (!variableMap.has(varName)) {
                    variableMap.set(varName, {
                        name: varName,
                        type: 'unknown',
                        description: `Jinja2 variable: ${varName}`
                    });
                }
            }
        }

        // 从条件语句中提取变量
        this.extractVariablesFromConditionals(cleanedText, variableMap);

        // 从循环语句中提取变量
        this.extractVariablesFromLoops(cleanedText, variableMap);

        // 推断变量类型
        variableMap.forEach(variable => {
            variable.type = this.inferVariableType(variable.name, text);
        });

        return Array.from(variableMap.values());
    }

    /**
     * 从条件语句中提取变量
     */
    private static extractVariablesFromConditionals(text: string, variableMap: Map<string, Jinja2Variable>): void {
        let match;
        const conditionalExp = this.JINJA2_PATTERNS.CONDITIONAL;

        while ((match = conditionalExp.exec(text)) !== null) {
            const condition = match[2].trim();

            // 简单的变量名提取（处理条件中的变量）
            const varMatches = condition.match(/([a-zA-Z_][a-zA-Z0-9_]*)/g);
            if (varMatches) {
                varMatches.forEach(varName => {
                    if (varName && !this.shouldIgnoreVariable(varName) && !this.isSQLKeyword(varName)) {
                        if (!variableMap.has(varName)) {
                            variableMap.set(varName, {
                                name: varName,
                                type: 'boolean', // 条件中的变量通常是布尔类型
                                description: `Jinja2 variable in condition: ${varName}`
                            });
                        }
                    }
                });
            }
        }
    }

    /**
     * 从循环语句中提取变量
     */
    private static extractVariablesFromLoops(text: string, variableMap: Map<string, Jinja2Variable>): void {
        let match;
        const loopExp = this.JINJA2_PATTERNS.LOOP;

        while ((match = loopExp.exec(text)) !== null) {
            const loopExpression = match[2].trim();

            // 简单的循环变量提取
            const varMatches = loopExpression.match(/([a-zA-Z_][a-zA-Z0-9_]*)/g);
            if (varMatches) {
                varMatches.forEach(varName => {
                    if (varName && !this.shouldIgnoreVariable(varName) && !this.isSQLKeyword(varName)) {
                        if (!variableMap.has(varName)) {
                            variableMap.set(varName, {
                                name: varName,
                                type: 'unknown',
                                description: `Jinja2 variable in loop: ${varName}`
                            });
                        }
                    }
                });
            }
        }
    }

    /**
     * 检查是否是SQL关键词
     */
    private static isSQLKeyword(varName: string): boolean {
        const upperName = varName.toUpperCase();
        return this.SQL_KEYWORDS.includes(upperName);
    }

    /**
     * 解析变量名（从复杂的表达式中提取基础变量名）
     */
    private static parseVariableName(expression: string): string | null {
        // 移除过滤器
        const withoutFilters = expression.split('|')[0].trim();

        // 处理点号访问（如 user.name）
        const baseName = withoutFilters.split('.')[0].trim();

        // 处理字典访问（如 user['name']）
        const bracketMatch = baseName.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[/);
        if (bracketMatch) {
            return bracketMatch[1];
        }

        // 验证变量名格式
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(baseName)) {
            return baseName;
        }

        return null;
    }

    /**
     * 判断是否应该忽略变量（如SQL关键词等）
     */
    private static shouldIgnoreVariable(varName: string): boolean {
        const upperName = varName.toUpperCase();
        return this.SQL_KEYWORDS.some(keyword => upperName === keyword);
    }

    /**
     * 推断变量类型
     */
    private static inferVariableType(varName: string, context: string): 'string' | 'number' | 'boolean' | 'null' | 'unknown' {
        const lowerName = varName.toLowerCase();

        // 基于命名约定推断类型
        if (lowerName.includes('id') || lowerName.includes('num') || lowerName.includes('count') || lowerName.includes('amount')) {
            return 'number';
        }

        if (lowerName.includes('is') || lowerName.includes('has') || lowerName.includes('can') || lowerName.includes('flag')) {
            return 'boolean';
        }

        if (lowerName.includes('name') || lowerName.includes('text') || lowerName.includes('str') || lowerName.includes('desc')) {
            return 'string';
        }

        // 基于上下文推断
        if (context.includes(`WHERE ${varName} IS NULL`) || context.includes(`WHERE ${varName} = NULL`)) {
            return 'null';
        }

        if (context.includes(`WHERE ${varName} =`) || context.includes(`WHERE ${varName} LIKE`)) {
            return 'string';
        }

        if (context.includes(`WHERE ${varName} >`) || context.includes(`WHERE ${varName} <`)) {
            return 'number';
        }

        return 'unknown';
    }

    /**
     * 生成演示SQL
     */
    private static generateDemoSQL(templateSQL: string, variables: Jinja2Variable[]): string {
        let demoSQL = templateSQL;
        const options = { ...this.DEFAULT_OPTIONS };

        // 为每个变量生成演示值
        variables.forEach(variable => {
            const demoValue = this.generateDemoValue(variable, options);
            const variablePattern = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
            demoSQL = demoSQL.replace(variablePattern, demoValue);
        });

        // 简单处理条件语句和循环（基础版本）
        demoSQL = this.simplifyControlStructures(demoSQL);

        return demoSQL;
    }

    /**
     * 为变量生成演示值
     */
    private static generateDemoValue(variable: Jinja2Variable, options: DemoDataGenerationOptions): string {
        switch (variable.type) {
            case 'string':
                const stringSamples = options.stringSamples || ['demo_string'];
                return `'${stringSamples[Math.floor(Math.random() * stringSamples.length)]}'`;

            case 'number':
                const [min, max] = options.numberRange || [1, 100];
                const num = Math.floor(Math.random() * (max - min + 1)) + min;
                return num.toString();

            case 'boolean':
                const booleanValues = options.booleanValues || [true, false];
                return booleanValues[Math.floor(Math.random() * booleanValues.length)] ? 'TRUE' : 'FALSE';

            case 'null':
                return options.includeNull ? 'NULL' : 'NULL';

            case 'unknown':
            default:
                // 通用演示值
                return `'demo_${variable.name}'`;
        }
    }

    /**
     * 简化控制结构（移除条件语句和循环，保留基础内容）
     */
    private static simplifyControlStructures(sql: string): string {
        let result = sql;

        // 处理条件语句 - 假设条件为真，保留内容
        result = result.replace(/\{%\s*if\s+([^%]+?)\s*%\}/g, '');
        result = result.replace(/\{%\s*elif\s+([^%]+?)\s*%\}/g, '');
        result = result.replace(/\{%\s*else\s*%\}/g, '');
        result = result.replace(/\{%\s*endif\s*%\}/g, '');

        // 处理循环语句 - 简化处理，移除循环标记
        result = result.replace(/\{%\s*for\s+([^%]+?)\s*%\}/g, '');
        result = result.replace(/\{%\s*endfor\s*%\}/g, '');

        return result;
    }

    /**
     * 处理Jinja2模板复制命令 - 使用Python脚本
     */
    public static async handleCopyJinja2Template(): Promise<boolean> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !editor.selection || editor.selection.isEmpty) {
                vscode.window.showWarningMessage('Please select a Jinja2 template SQL to copy.', { modal: false });
                return false;
            }

            const selectedText = editor.document.getText(editor.selection);

            // 使用Python脚本处理Jinja2模板
            const result = await this.processWithPythonScript(selectedText);

            if (!result.success) {
                vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${result.error}`, { modal: false });
                return false;
            }

            if (result.variables.length === 0) {
                // 没有变量，直接复制
                await vscode.env.clipboard.writeText(result.demoSQL || '');
                vscode.window.showInformationMessage('No variables found in Jinja2 template. SQL copied to clipboard.', { modal: false });
                return true;
            }

            // 获取用户输入的变量值
            const userValues = await this.getUserInputForVariables(result.variables);
            if (!userValues) {
                return false; // 用户取消了输入
            }

            // 使用用户输入的值重新生成SQL
            const finalSQL = await this.generateSQLWithUserValues(selectedText, userValues);

            // 复制最终SQL到剪贴板
            await vscode.env.clipboard.writeText(finalSQL);

            // 显示结果信息
            const message = `Generated SQL from Jinja2 template with ${result.variables.length} variable(s).`;
            const detail = `Variables used: ${Object.entries(userValues).map(([name, value]) => `${name} = ${value}`).join(', ')}\n\nGenerated SQL:\n${finalSQL}`;

            vscode.window.showInformationMessage(message, {
                modal: false,
                detail
            });

            return true;
        } catch (error) {
            console.error('Error in handleCopyJinja2Template:', error);
            vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error instanceof Error ? error.message : String(error)}`, { modal: false });
            return false;
        }
    }

    /**
     * 获取用户输入的变量值
     */
    private static async getUserInputForVariables(variables: any[]): Promise<Record<string, any> | null> {
        const userValues: Record<string, any> = {};

        // 显示变量输入界面
        for (const variable of variables) {
            const inputOptions: vscode.InputBoxOptions = {
                title: `Enter value for variable: ${variable.name}`,
                prompt: `Type: ${variable.type}${variable.description ? `\nDescription: ${variable.description}` : ''}`,
                placeHolder: this.getPlaceholderForType(variable.type, variable.name),
                validateInput: (value: string) => {
                    return this.validateVariableInput(value, variable.type);
                }
            };

            const value = await vscode.window.showInputBox(inputOptions);
            if (value === undefined) {
                // 用户取消了输入
                return null;
            }

            userValues[variable.name] = this.formatValueByType(value, variable.type);
        }

        return userValues;
    }

    /**
     * 根据变量类型获取占位符文本
     */
    private static getPlaceholderForType(type: string, varName: string): string {
        switch (type) {
            case 'string':
                return 'Enter a string value...';
            case 'number':
            case 'integer':
                if (varName.includes('limit')) {
                    return 'e.g., 10, 50, 100';
                }
                if (varName.includes('offset')) {
                    return 'e.g., 0, 10, 20';
                }
                return 'Enter a number...';
            case 'boolean':
                return 'true or false';
            case 'date':
                return 'e.g., 2024-01-01, 2024-12-31';
            default:
                return 'Enter a value...';
        }
    }

    /**
     * 验证用户输入
     */
    private static validateVariableInput(value: string, type: string): string | null {
        if (!value.trim()) {
            return 'Value cannot be empty';
        }

        switch (type) {
            case 'number':
            case 'integer':
                if (!/^-?\d+$/.test(value.trim())) {
                    return 'Please enter a valid integer';
                }
                break;
            case 'boolean':
                const lowerValue = value.trim().toLowerCase();
                if (lowerValue !== 'true' && lowerValue !== 'false') {
                    return 'Please enter true or false';
                }
                break;
            case 'date':
                // 简单的日期格式验证
                if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
                    return 'Please enter a date in YYYY-MM-DD format';
                }
                break;
        }

        return null; // 验证通过
    }

    /**
     * 根据变量类型格式化值
     */
    private static formatValueByType(value: string, type: string): any {
        const trimmedValue = value.trim();

        switch (type) {
            case 'number':
            case 'integer':
                return parseInt(trimmedValue, 10);
            case 'boolean':
                return trimmedValue.toLowerCase() === 'true';
            case 'date':
                return `'${trimmedValue}'`; // 日期作为字符串处理，加上引号
            case 'string':
            default:
                // 字符串需要加上SQL引号
                return `'${trimmedValue.replace(/'/g, "''")}'`; // 转义单引号
        }
    }

    /**
     * 使用用户输入的值生成SQL
     */
    private static async generateSQLWithUserValues(templateSQL: string, userValues: Record<string, any>): Promise<string> {
        try {
            // 创建Python脚本来渲染模板
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // 获取脚本路径
            const extensionPath = vscode.extensions.getExtension('l8ng.sqlsugar')?.extensionPath || process.cwd();
            const scriptPath = require('path').join(extensionPath, 'scripts', 'jinja2-render.py');

            // 准备输入数据
            const inputData = {
                template: templateSQL,
                variables: userValues
            };

            // 执行Python脚本
            const { stdout, stderr } = await execAsync(
                `uv run "${scriptPath}" --json`,
                {
                    input: JSON.stringify(inputData),
                    encoding: 'utf8',
                    timeout: 10000
                }
            );

            if (stderr) {
                console.warn('Python script stderr:', stderr);
            }

            const result = JSON.parse(stdout);
            if (result.success) {
                return result.sql;
            } else {
                throw new Error(result.error || 'Failed to render template');
            }

        } catch (error: any) {
            console.error('Error generating SQL with user values:', error);
            // 回退到简单的替换方式
            let result = templateSQL;
            for (const [varName, value] of Object.entries(userValues)) {
                const pattern = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
                result = result.replace(pattern, String(value));
            }
            return result;
        }
    }

    /**
     * 使用Python脚本处理Jinja2模板
     */
    private static async processWithPythonScript(templateContent: string): Promise<{
        success: boolean;
        variables: any[];
        demoSQL?: string;
        error?: string;
        has_conditionals?: boolean;
        has_loops?: boolean;
    }> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // 获取脚本路径
            const extensionPath = vscode.extensions.getExtension('l8ng.sqlsugar')?.extensionPath ||
                              process.cwd();
            const scriptPath = require('path').join(extensionPath, 'scripts', 'jinja2-simple-processor.py');

            // 执行Python脚本
            const { stdout, stderr } = await execAsync(
                `uv run "${scriptPath}" --json`,
                {
                    input: templateContent,
                    encoding: 'utf8',
                    timeout: 10000 // 10秒超时
                }
            );

            if (stderr) {
                console.warn('Python script stderr:', stderr);
            }

            // 解析JSON输出
            const result = JSON.parse(stdout);
            return result;

        } catch (error: any) {
            console.error('Error calling Python script:', error);

            // 如果Python脚本不可用，回退到TypeScript实现
            console.log('Falling back to TypeScript implementation...');
            const analysis = this.analyzeTemplate(templateContent);

            if (analysis) {
                return {
                    success: true,
                    variables: analysis.variables,
                    demoSQL: analysis.demoSQL,
                    has_conditionals: analysis.hasJinja2Syntax,
                    has_loops: false
                };
            } else {
                return {
                    success: false,
                    variables: [],
                    error: `Failed to process template: ${error.message}. Make sure 'uv' and Python are installed.`
                };
            }
        }
    }
}