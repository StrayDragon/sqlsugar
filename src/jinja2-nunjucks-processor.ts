import * as vscode from 'vscode';
import * as nunjucks from 'nunjucks';

/**
 * Jinja2变量接口
 */
export interface Jinja2Variable {
    name: string;
    type: 'string' | 'number' | 'date';
    defaultValue?: any;
    description?: string;
    required?: boolean;
}

/**
 * 基于nunjucks的Jinja2处理器
 * 完全支持Jinja2语法，解决Python脚本沙盒问题
 */
export class Jinja2NunjucksProcessor {
    private static instance: Jinja2NunjucksProcessor;
    private env: nunjucks.Environment;

    private constructor() {
        // 创建nunjucks环境，支持字符串模板
        this.env = new nunjucks.Environment();

        // 添加自定义过滤器
        this.addCustomFilters();

        // 添加自定义全局函数
        this.addCustomGlobals();

        // 设置过滤器容错处理
        this.setupFilterFallback();
    }

    public static getInstance(): Jinja2NunjucksProcessor {
        if (!Jinja2NunjucksProcessor.instance) {
            Jinja2NunjucksProcessor.instance = new Jinja2NunjucksProcessor();
        }
        return Jinja2NunjucksProcessor.instance;
    }

    /**
     * 添加自定义过滤器
     */
    private addCustomFilters(): void {
        // SQL相关的过滤器
        this.env.addFilter('sql_quote', (value: any) => {
            if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
            }
            return value;
        });

        this.env.addFilter('sql_identifier', (value: string) => {
            return `"${value.replace(/"/g, '""')}"`;
        });

        // 日期格式化过滤器
        this.env.addFilter('sql_date', (value: any, format: string = 'YYYY-MM-DD') => {
            const date = new Date(value);
            return this.formatSQLDate(date, format);
        });

        this.env.addFilter('sql_datetime', (value: any) => {
            const date = new Date(value);
            return date.toISOString().replace('T', ' ').replace('Z', '');
        });

        // 数组处理过滤器
        this.env.addFilter('sql_in', (values: any[]) => {
            if (Array.isArray(values)) {
                return values.map(v => this.env.getFilter('sql_quote')(v)).join(', ');
            }
            return this.env.getFilter('sql_quote')(values);
        });

        // 常用类型转换过滤器
        this.env.addFilter('float', (value: any) => {
            return parseFloat(value);
        });

        this.env.addFilter('int', (value: any, base: number = 10) => {
            return parseInt(value, base);
        });

        this.env.addFilter('string', (value: any) => {
            return String(value);
        });

        this.env.addFilter('bool', (value: any) => {
            if (typeof value === 'boolean') {return value;}
            if (typeof value === 'string') {
                const lower = value.toLowerCase();
                return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
            }
            return Boolean(value);
        });

        // 默认值过滤器
        this.env.addFilter('default', (value: any, defaultValue: any, boolean: boolean = false) => {
            if (boolean) {
                return value ? value : defaultValue;
            }
            return value !== undefined && value !== null ? value : defaultValue;
        });

        // 字符串过滤器
        this.env.addFilter('striptags', (value: string) => {
            return value.replace(/<[^>]*>/g, '');
        });

        this.env.addFilter('truncate', (value: string, length: number = 255, killwords: boolean = false, end: string = '...') => {
            if (value.length <= length) {return value;}
            const truncated = value.substring(0, length - end.length);
            return truncated + end;
        });

        this.env.addFilter('wordwrap', (value: string, width: number = 79, break_long_words: boolean = false, wrapstring: string = '\n') => {
            const words = value.split(' ');
            const lines: string[] = [];
            let currentLine = '';

            for (const word of words) {
                if (currentLine.length + word.length + 1 <= width) {
                    currentLine += (currentLine ? ' ' : '') + word;
                } else {
                    if (currentLine) {lines.push(currentLine);}
                    currentLine = word;
                }
            }
            if (currentLine) {lines.push(currentLine);}

            return lines.join(wrapstring);
        });

        this.env.addFilter('urlencode', (value: string) => {
            return encodeURIComponent(value);
        });

        // 数学和统计过滤器
        this.env.addFilter('abs', (value: number) => {
            return Math.abs(Number(value));
        });

        this.env.addFilter('round', (value: number, precision: number = 0, method: string = 'common') => {
            const num = Number(value);
            if (precision === 0) {
                return Math.round(num);
            }
            const factor = Math.pow(10, precision);
            return Math.round(num * factor) / factor;
        });

        this.env.addFilter('sum', (value: any[], attribute?: string) => {
            if (attribute) {
                return value.reduce((sum, item) => sum + Number(item[attribute]), 0);
            }
            return value.reduce((sum, item) => sum + Number(item), 0);
        });

        this.env.addFilter('min', (value: any[], attribute?: string) => {
            if (attribute) {
                return Math.min(...value.map(item => Number(item[attribute])));
            }
            return Math.min(...value.map(Number));
        });

        this.env.addFilter('max', (value: any[], attribute?: string) => {
            if (attribute) {
                return Math.max(...value.map(item => Number(item[attribute])));
            }
            return Math.max(...value.map(Number));
        });

        // 列表过滤器
        this.env.addFilter('unique', (value: any[]) => {
            return [...new Set(value)];
        });

        this.env.addFilter('reverse', (value: any[]) => {
            return [...value].reverse();
        });

        this.env.addFilter('first', (value: any[]) => {
            return value[0];
        });

        this.env.addFilter('last', (value: any[]) => {
            return value[value.length - 1];
        });

        this.env.addFilter('length', (value: any) => {
            if (Array.isArray(value)) {return value.length;}
            if (typeof value === 'string') {return value.length;}
            if (typeof value === 'object' && value !== null) {return Object.keys(value).length;}
            return 0;
        });

        this.env.addFilter('slice', (value: any[], start: number, end?: number) => {
            return value.slice(start, end);
        });

        // 字典过滤器
        this.env.addFilter('dictsort', (value: Record<string, any>, case_sensitive: boolean = false, by: 'key' | 'value' = 'key') => {
            const entries = Object.entries(value);
            entries.sort((a, b) => {
                let aValue: any, bValue: any;
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

                if (aValue < bValue) {return -1;}
                if (aValue > bValue) {return 1;}
                return 0;
            });
            return entries;
        });

        // JSON过滤器
        this.env.addFilter('tojson', (value: any, indent: number = 0) => {
            return JSON.stringify(value, null, indent);
        });

        // 测试过滤器
        this.env.addFilter('equalto', (value: any, other: any) => {
            return value === other;
        });

        // 实用过滤器
        this.env.addFilter('filesizeformat', (value: number, binary: boolean = false) => {
            const base = binary ? 1024 : 1000;
            const units = binary ?
                ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] :
                ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

            let bytes = Number(value);
            if (bytes < base) {return bytes + ' ' + units[0];}

            const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
            const size = bytes / Math.pow(base, exp);
            return size.toFixed(1) + ' ' + units[exp];
        });
    }

    /**
     * 添加自定义全局函数
     */
    private addCustomGlobals(): void {
        // 添加一些常用的SQL函数
        this.env.addGlobal('now', () => new Date());
        this.env.addGlobal('uuid', () => this.generateUUID());
    }

    /**
     * 从模板中提取变量
     */
    public extractVariables(template: string): Jinja2Variable[] {
        const variables: Jinja2Variable[] = [];
        const regex = /\{\{\s*([^}]+)\s*\}\}/g;
        const conditionRegex = /\{%\s*(if|elif|for)\s+([^%]+)\s*%}/g;

        const processedNames = new Set<string>();

        // 提取变量引用
        let match;
        while ((match = regex.exec(template)) !== null) {
            const expr = match[1].trim();
            const vars = this.extractVariablesFromExpression(expr);

            vars.forEach(varName => {
                if (!processedNames.has(varName)) {
                    variables.push({
                        name: varName,
                        type: this.inferVariableType(varName),
                        defaultValue: this.getDefaultValue(varName),
                        required: this.isRequiredVariable(varName)
                    });
                    processedNames.add(varName);
                }
            });
        }

        // 提取条件语句中的变量
        while ((match = conditionRegex.exec(template)) !== null) {
            const condition = match[2].trim();
            const vars = this.extractVariablesFromExpression(condition);

            vars.forEach(varName => {
                if (!processedNames.has(varName)) {
                    variables.push({
                        name: varName,
                        type: this.inferVariableType(varName),
                        defaultValue: this.getDefaultValue(varName),
                        required: true
                    });
                    processedNames.add(varName);
                }
            });
        }

        return variables;
    }

    /**
     * 从表达式中提取变量名
     */
    private extractVariablesFromExpression(expr: string): string[] {
        const variables: string[] = [];

        // 处理简单的变量引用
        const varRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)/g;
        let match;

        while ((match = varRegex.exec(expr)) !== null) {
            const varName = match[1];

            // 排除函数名和关键字
            const excludedWords = ['if', 'elif', 'else', 'endif', 'for', 'endfor', 'in', 'and', 'or', 'not', 'true', 'false', 'none', 'null'];
            if (!excludedWords.includes(varName.toLowerCase()) && !varName.includes('(')) {
                variables.push(varName);
            }
        }

        // 安全地去重 - 避免使用 spread syntax
        const uniqueVariables = Array.from(new Set(variables));
        return uniqueVariables;
    }

    /**
     * 推断变量类型
     */
    private inferVariableType(varName: string): 'string' | 'number' | 'date' {
        const name = varName.toLowerCase();

        // 基于命名惯例推断类型
        if (name.includes('id') || name.includes('num') || name.includes('count') || name.includes('amount')) {
            return 'number';
        }

        if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated')) {
            return 'date';
        }

        return 'string';
    }

    /**
     * 获取变量的默认值
     */
    private getDefaultValue(varName: string): any {
        const type = this.inferVariableType(varName);

        switch (type) {
            case 'number':
                return 42;
            case 'date':
                return new Date().toISOString().split('T')[0];
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
     * 渲染模板
     */
    public renderTemplate(template: string, context: Record<string, any>): string {
        try {
            return this.env.renderString(template, context);
        } catch (error) {
            console.error('Template rendering error:', error);
            throw new Error(`Failed to render template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 生成演示SQL
     */
    public generateDemoSQL(template: string): { sql: string; variables: Jinja2Variable[] } {
        const variables = this.extractVariables(template);
        const context: Record<string, any> = {};

        // 构建演示上下文
        variables.forEach(variable => {
            context[variable.name] = variable.defaultValue;
        });

        // 渲染模板
        const sql = this.renderTemplate(template, context);

        return { sql, variables };
    }

    /**
     * 使用自定义变量渲染模板
     */
    public renderWithCustomVariables(template: string, variables: Record<string, any>): string {
        return this.renderTemplate(template, variables);
    }

    /**
     * 验证模板语法
     */
    public validateTemplate(template: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        try {
            // 基本语法检查
            if (!template.includes('{{') && !template.includes('{%')) {
                return { valid: true, errors: [] };
            }

            // 尝试编译模板
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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
        // 为常见的未实现过滤器提供默认实现
        // 使用 try-catch 来检测过滤器是否存在
        const unknownFilters = [
            'tojson', 'filesizeformat', 'equalto'
        ];

        unknownFilters.forEach(filterName => {
            try {
                this.env.getFilter(filterName);
            } catch (error) {
                // 如果过滤器不存在，添加一个默认实现
                this.env.addFilter(filterName, (value: any, ...args: any[]) => {
                    console.warn(`Unknown filter "${filterName}" ignored, returning original value`);
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
            // SQL相关过滤器
            'sql_quote', 'sql_identifier', 'sql_date', 'sql_datetime', 'sql_in',

            // 类型转换过滤器
            'int', 'float', 'string', 'bool',

            // 字符串过滤器 (Nunjucks内置)
            'title', 'upper', 'lower', 'capitalize', 'trim', 'default',
            'striptags', 'truncate', 'wordwrap', 'urlencode',

            // 数学和统计过滤器
            'abs', 'round', 'sum', 'min', 'max',

            // 列表过滤器
            'length', 'join', 'replace', 'split', 'slice', 'first', 'last',
            'unique', 'reverse', 'sort',

            // 字典过滤器
            'dictsort',

            // JSON过滤器
            'tojson',

            // 测试过滤器
            'equalto',

            // 实用过滤器
            'filesizeformat'
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
            '自定义过滤器和函数'
        ];
    }
}