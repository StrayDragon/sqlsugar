import * as vscode from 'vscode';
import { Jinja2WebviewEditor } from './jinja2-webview';
import { VariableTypeInference } from './jinja2-type-inference';
import { Jinja2TypeInferenceConfig } from './jinja2-type-inference-config';

export interface Jinja2Variable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'null' | 'unknown' | 'integer' | 'date' | 'time' | 'datetime' | 'json' | 'uuid' | 'email' | 'url';
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
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "处理 Jinja2 模板",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "初始化处理...", increment: 0 });

                const editor = vscode.window.activeTextEditor;
                if (!editor || !editor.selection || editor.selection.isEmpty) {
                    vscode.window.showWarningMessage('Please select a Jinja2 template SQL to copy.', { modal: false });
                    return false;
                }

                progress.report({ message: "获取选中文本...", increment: 10 });
                const selectedText = editor.document.getText(editor.selection);

                progress.report({ message: "解析 Jinja2 模板...", increment: 30 });
                // 使用Python脚本处理Jinja2模板
                const result = await this.processWithPythonScript(selectedText);

                if (!result.success) {
                    vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${result.error}`, { modal: false });
                    return false;
                }

                if (result.variables.length === 0) {
                    // 没有变量，直接复制
                    progress.report({ message: "复制 SQL 到剪贴板...", increment: 80 });
                    await vscode.env.clipboard.writeText(result.demoSQL || '');
                    vscode.window.showInformationMessage('No variables found in Jinja2 template. SQL copied to clipboard.', { modal: false });
                    return true;
                }

                // 添加模板内容到变量中，用于预览
                const variablesWithTemplate = result.variables.map(v => ({
                    ...v,
                    templateContent: selectedText
                }));

                progress.report({ message: "获取用户输入...", increment: 50 });
                // 获取用户输入的变量值
                const userValues = await this.getUserInputForVariables(variablesWithTemplate);
                if (!userValues) {
                    return false; // 用户取消了输入
                }

                progress.report({ message: "生成最终 SQL...", increment: 70 });
                // 使用用户输入的值重新生成SQL
                const finalSQL = await this.generateSQLWithUserValues(selectedText, userValues);

                progress.report({ message: "显示预览...", increment: 85 });
                // 显示最终预览并确认
                const shouldCopy = await this.showFinalSQLPreview(finalSQL, result.variables.length);
                if (!shouldCopy) {
                    return false; // 用户选择了不复制
                }

                progress.report({ message: "复制 SQL 到剪贴板...", increment: 95 });
                // 复制最终SQL到剪贴板
                await vscode.env.clipboard.writeText(finalSQL);

                // 显示结果信息
                const message = `Generated SQL from Jinja2 template with ${result.variables.length} variable(s).`;
                const detail = `Variables used: ${Object.entries(userValues).map(([name, value]) => `${name} = ${value}`).join(', ')}`;

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
        });
    }

    /**
     * 快速模式：直接使用默认值生成SQL
     */
    public static async handleCopyJinja2TemplateQuick(): Promise<boolean> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "快速处理 Jinja2 模板",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "初始化处理...", increment: 0 });

                const editor = vscode.window.activeTextEditor;
                if (!editor || !editor.selection || editor.selection.isEmpty) {
                    vscode.window.showWarningMessage('Please select a Jinja2 template SQL to copy.', { modal: false });
                    return false;
                }

                progress.report({ message: "获取选中文本...", increment: 20 });
                const selectedText = editor.document.getText(editor.selection);

                progress.report({ message: "解析 Jinja2 模板...", increment: 40 });
                // 使用Python脚本处理Jinja2模板
                const result = await this.processWithPythonScript(selectedText);

                if (!result.success) {
                    vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${result.error}`, { modal: false });
                    return false;
                }

                progress.report({ message: "生成默认 SQL...", increment: 70 });
                // 使用默认值生成SQL
                const finalSQL = result.demoSQL || '';

                progress.report({ message: "复制 SQL 到剪贴板...", increment: 90 });
                // 复制到剪贴板
                await vscode.env.clipboard.writeText(finalSQL);

                // 显示结果信息
                const message = result.variables.length > 0
                    ? `Generated demo SQL from Jinja2 template with ${result.variables.length} variable(s) using default values.`
                    : 'Generated SQL from Jinja2 template (no variables found).';

                vscode.window.showInformationMessage(message, { modal: false });

                return true;
            } catch (error) {
                console.error('Error in handleCopyJinja2TemplateQuick:', error);
                vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error instanceof Error ? error.message : String(error)}`, { modal: false });
                return false;
            }
        });
    }

    /**
     * Webview模式：直接打开可视化编辑器
     */
    public static async handleCopyJinja2TemplateWebview(): Promise<boolean> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "启动可视化编辑器",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "初始化可视化编辑器...", increment: 0 });

                const editor = vscode.window.activeTextEditor;
                if (!editor || !editor.selection || editor.selection.isEmpty) {
                    vscode.window.showWarningMessage('Please select a Jinja2 template SQL to copy.', { modal: false });
                    return false;
                }

                progress.report({ message: "获取选中文本...", increment: 15 });
                const selectedText = editor.document.getText(editor.selection);

                progress.report({ message: "解析 Jinja2 模板...", increment: 30 });
                // 使用Python脚本处理Jinja2模板
                const result = await this.processWithPythonScript(selectedText);

                if (!result.success) {
                    vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${result.error}`, { modal: false });
                    return false;
                }

                if (result.variables.length === 0) {
                    // 没有变量，直接复制
                    progress.report({ message: "复制 SQL 到剪贴板...", increment: 80 });
                    await vscode.env.clipboard.writeText(result.demoSQL || '');
                    vscode.window.showInformationMessage('No variables found in Jinja2 template. SQL copied to clipboard.', { modal: false });
                    return true;
                }

                progress.report({ message: "准备可视化编辑器...", increment: 50 });
                // 添加模板内容到变量中
                const variablesWithTemplate = result.variables.map(v => ({
                    ...v,
                    templateContent: selectedText
                }));

                progress.report({ message: "启动可视化编辑器...", increment: 70 });
                // 直接打开Webview编辑器
                const userValues = await Jinja2WebviewEditor.showEditor(
                    selectedText,
                    result.variables,
                    'Jinja2模板可视化编辑器'
                );

                if (!userValues) {
                    return false; // 用户关闭了编辑器
                }

                progress.report({ message: "生成最终 SQL...", increment: 85 });
                // 生成最终SQL
                const finalSQL = await this.generateSQLWithUserValues(selectedText, userValues);

                progress.report({ message: "复制 SQL 到剪贴板...", increment: 95 });
                // 复制到剪贴板
                await vscode.env.clipboard.writeText(finalSQL);

                // 显示结果信息
                const message = `Generated SQL from Jinja2 template with ${result.variables.length} variable(s) using visual editor.`;
                vscode.window.showInformationMessage(message, { modal: false });

                return true;
            } catch (error) {
                console.error('Error in handleCopyJinja2TemplateWebview:', error);
                vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error instanceof Error ? error.message : String(error)}`, { modal: false });
                return false;
            }
        });
    }

    /**
     * 获取用户输入的变量值 - 增强版
     */
    private static async getUserInputForVariables(variables: any[]): Promise<Record<string, any> | null> {
        if (variables.length === 0) {
            return {};
        }

        // 提供输入方式选择
        const inputMethod = await vscode.window.showQuickPick(
            [
                {
                    label: '向导模式',
                    detail: '逐个输入变量值，带有智能建议',
                    description: '适合少量变量或需要精确控制'
                },
                {
                    label: '快速模式',
                    detail: '一次性输入所有变量（JSON格式）',
                    description: '适合大量变量或批量处理'
                },
                {
                    label: '可视化编辑器',
                    detail: '图形化界面配置变量，实时预览SQL',
                    description: '适合复杂模板或需要可视化操作'
                },
                {
                    label: '使用默认值',
                    detail: '使用系统生成的默认演示值',
                    description: '适合快速生成演示SQL'
                }
            ],
            {
                title: '选择变量输入方式',
                placeHolder: '如何为Jinja2模板变量提供值？'
            }
        );

        if (!inputMethod) {
            return null; // 用户取消了选择
        }

        switch (inputMethod.label) {
            case '向导模式':
                return this.getUserInputWizard(variables);
            case '快速模式':
                return this.getUserInputQuickMode(variables);
            case '可视化编辑器':
                return this.getUserInputWebview(variables);
            case '使用默认值':
                return this.generateDefaultValues(variables);
            default:
                return null;
        }
    }

    /**
     * 向导模式：逐个输入变量值（带实时预览）
     */
    private static async getUserInputWizard(variables: any[]): Promise<Record<string, any> | null> {
        const userValues: Record<string, any> = {};
        const templateContent = variables.length > 0 ? variables[0].templateContent || '' : '';

        // 显示总进度
        const progressOptions = {
            title: `配置变量值 (${variables.length} 个变量)`,
            location: vscode.ProgressLocation.Notification,
            cancellable: true
        };

        await vscode.window.withProgress(progressOptions, async (progress, token) => {
            for (let i = 0; i < variables.length; i++) {
                if (token.isCancellationRequested) {
                    return null;
                }

                const variable = variables[i];
                progress.report({
                    message: `配置变量 ${i + 1}/${variables.length}: ${variable.name}`,
                    increment: (100 / variables.length)
                });

                // 生成智能默认值
                const defaultValue = this.getSmartDefaultValue(variable);

                const inputOptions: vscode.InputBoxOptions = {
                    title: `配置变量值 (${i + 1}/${variables.length})`,
                    prompt: `变量: ${variable.name}\n类型: ${variable.type}${variable.description ? `\n描述: ${variable.description}` : ''}`,
                    placeHolder: this.getPlaceholderForType(variable.type, variable.name),
                    value: defaultValue.toString(),
                    validateInput: (value: string) => {
                        return this.validateVariableInput(value, variable.type);
                    }
                };

                const value = await vscode.window.showInputBox(inputOptions);
                if (value === undefined) {
                    return null;
                }

                userValues[variable.name] = this.formatValueByType(value, variable.type);

                // 在最后一个变量输入后显示预览
                if (i === variables.length - 1 && templateContent) {
                    await this.showSQLPreview(templateContent, userValues);
                }
            }
        });

        return userValues;
    }

    /**
     * Webview模式：可视化编辑器
     */
    private static async getUserInputWebview(variables: any[]): Promise<Record<string, any> | null> {
        try {
            const templateContent = variables.length > 0 ? variables[0].templateContent || '' : '';

            const userValues = await Jinja2WebviewEditor.showEditor(
                templateContent,
                variables,
                'Jinja2模板变量配置'
            );

            return userValues;
        } catch (error) {
            console.warn('Webview editor was closed or failed:', error);
            return null;
        }
    }

    /**
     * 快速模式：JSON格式一次性输入
     */
    private static async getUserInputQuickMode(variables: any[]): Promise<Record<string, any> | null> {
        // 生成JSON模板
        const jsonTemplate = this.generateJSONTemplate(variables);

        const inputOptions: vscode.InputBoxOptions = {
            title: '批量输入变量值 (JSON格式)',
            prompt: '请输入JSON格式的变量值，例如：\n' + jsonTemplate,
            placeHolder: '{"variable_name": "value", "number_var": 42}',
            value: jsonTemplate,
            validateInput: (value: string) => {
                try {
                    const parsed = JSON.parse(value);
                    const missingVars = variables.filter(v => !(v.name in parsed));
                    if (missingVars.length > 0) {
                        return `缺少变量: ${missingVars.map(v => v.name).join(', ')}`;
                    }

                    // 验证变量类型
                    for (const [varName, varValue] of Object.entries(parsed)) {
                        const variable = variables.find(v => v.name === varName);
                        if (variable) {
                            const validationResult = this.validateVariableValue(varValue, variable.type);
                            if (validationResult) {
                                return `${varName}: ${validationResult}`;
                            }
                        }
                    }

                    return null;
                } catch (error) {
                    return 'JSON格式错误: ' + (error instanceof Error ? error.message : String(error));
                }
            }
        };

        const jsonValue = await vscode.window.showInputBox(inputOptions);
        if (!jsonValue) {
            return null;
        }

        try {
            const parsed = JSON.parse(jsonValue);
            // 格式化值以符合SQL语法
            const formattedValues: Record<string, any> = {};
            for (const [varName, varValue] of Object.entries(parsed)) {
                const variable = variables.find(v => v.name === varName);
                if (variable) {
                    formattedValues[varName] = this.formatValueByType(String(varValue), variable.type);
                }
            }
            return formattedValues;
        } catch (error) {
            vscode.window.showErrorMessage('JSON解析失败');
            return null;
        }
    }

    /**
     * 生成默认值
     */
    private static generateDefaultValues(variables: any[]): Record<string, any> {
        const values: Record<string, any> = {};
        for (const variable of variables) {
            values[variable.name] = this.getSmartDefaultValue(variable);
        }
        return values;
    }

    /**
     * 生成JSON模板
     */
    private static generateJSONTemplate(variables: any[]): string {
        const template: Record<string, any> = {};
        for (const variable of variables) {
            template[variable.name] = this.getSmartDefaultValue(variable);
        }
        return JSON.stringify(template, null, 2);
    }

    /**
     * 获取智能默认值
     */
    private static getSmartDefaultValue(variable: any): any {
        const lowerName = variable.name.toLowerCase();

        switch (variable.type) {
            case 'string':
                if (lowerName.includes('name')) {return 'demo_name';}
                if (lowerName.includes('email')) {return 'demo@example.com';}
                if (lowerName.includes('id')) {return 'demo_id';}
                if (lowerName.includes('status')) {return 'active';}
                if (lowerName.includes('date') || lowerName.includes('time')) {return '2024-01-01';}
                return 'demo_value';

            case 'number':
            case 'integer':
                if (lowerName.includes('limit')) {return 10;}
                if (lowerName.includes('offset')) {return 0;}
                if (lowerName.includes('age')) {return 25;}
                if (lowerName.includes('count')) {return 1;}
                if (lowerName.includes('id')) {return 123;}
                return 42;

            case 'boolean':
                if (lowerName.includes('is_') || lowerName.includes('has_') || lowerName.includes('can_')) {
                    return true;
                }
                return false;

            case 'date':
                return '2024-01-01';

            default:
                return 'demo_value';
        }
    }

    /**
     * 验证变量值（针对快速模式）
     */
    private static validateVariableValue(value: any, type: string): string | null {
        switch (type) {
            case 'number':
            case 'integer':
                if (typeof value !== 'number' || !Number.isInteger(value)) {
                    return '必须是整数';
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return '必须是布尔值';
                }
                break;
            case 'string':
                if (typeof value !== 'string') {
                    return '必须是字符串';
                }
                break;
        }
        return null;
    }

    /**
     * 显示SQL预览
     */
    private static async showSQLPreview(templateContent: string, userValues: Record<string, any>): Promise<void> {
        try {
            const previewSQL = await this.generateSQLWithUserValues(templateContent, userValues);

            const showPreview = await vscode.window.showInformationMessage(
                '是否要预览生成的SQL？',
                { modal: false },
                '预览', '跳过'
            );

            if (showPreview === '预览') {
                // 显示预览文档
                const document = await vscode.workspace.openTextDocument({
                    content: previewSQL,
                    language: 'sql'
                });
                await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside });
            }
        } catch (error) {
            console.warn('Failed to show SQL preview:', error);
        }
    }

    /**
     * 显示最终SQL预览并确认复制
     */
    private static async showFinalSQLPreview(finalSQL: string, variableCount: number): Promise<boolean> {
        const options = [
            { label: '复制到剪贴板', description: '将生成的SQL复制到剪贴板' },
            { label: '预览并复制', description: '先预览SQL再复制到剪贴板' },
            { label: '取消', description: '取消操作' }
        ];

        const choice = await vscode.window.showQuickPick(options, {
            title: 'SQL生成完成',
            placeHolder: `已处理 ${variableCount} 个变量，如何处理生成的SQL？`
        });

        if (!choice || choice.label === '取消') {
            return false;
        }

        if (choice.label === '预览并复制') {
            // 显示预览文档
            const document = await vscode.workspace.openTextDocument({
                content: finalSQL,
                language: 'sql'
            });
            await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside });

            // 询问是否复制
            const shouldCopy = await vscode.window.showInformationMessage(
                '是否复制此SQL到剪贴板？',
                { modal: false },
                '复制', '不复制'
            );

            return shouldCopy === '复制';
        }

        return choice.label === '复制到剪贴板';
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
            // 显示进度通知
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在处理Jinja2模板...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "初始化Python处理器..." });

                // 创建Python脚本来渲染模板
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);

                // 获取脚本路径
                const extensionPath = vscode.extensions.getExtension('l8ng.sqlsugar')?.extensionPath || process.cwd();
                const scriptPath = require('path').join(extensionPath, 'scripts', 'jinja2-simple-processor.py');

                // 准备输入数据
                const inputData = {
                    template: templateSQL,
                    variables: userValues
                };

                progress.report({ increment: 30, message: "执行Python脚本处理..." });

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
            });

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
                    input: JSON.stringify({ template: templateContent }),
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