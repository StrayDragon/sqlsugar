/**
 * 智能变量类型推断系统
 * 支持基于命名约定、正则匹配和用户自定义规则的类型推断
 */

export interface TypeInferenceRule {
    name: string;
    pattern: string | RegExp;
    type: VariableType;
    confidence: number;
    description?: string;
    subType?: string; // 如 'string.email', 'date.iso8601' 等
    format?: string; // 默认格式建议
}

export interface VariableTypeConfig {
    type: VariableType;
    subType?: string;
    format?: string; // 日期/时间格式
    options?: string[]; // 枚举值选项
    validation?: {
        pattern?: RegExp;
        min?: number;
        max?: number;
        custom?: (value: any) => boolean;
    };
}

export type VariableType =
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

export interface VariableInference {
    type: VariableType;
    subType?: string;
    confidence: number;
    format?: string;
    defaultFormats?: string[];
    suggestions: any[];
    rules: TypeInferenceRule[];
}

/**
 * 智能变量类型推断器
 */
export class VariableTypeInference {
    private static readonly DEFAULT_RULES: TypeInferenceRule[] = [
        // ID相关 - 数字类型
        { name: '数字ID', pattern: /.*_?id$/i, type: 'integer', confidence: 0.9, description: '主键或外键ID' },
        { name: '用户ID', pattern: /(user|account|member|customer)_?id$/i, type: 'integer', confidence: 0.95, subType: 'user.id' },
        { name: '序列ID', pattern: /(seq|sequence)_?id$/i, type: 'integer', confidence: 0.9, subType: 'sequence.id' },

        // 数值相关
        { name: '计数', pattern: /(count|num|total|quantity|amount)$/i, type: 'integer', confidence: 0.8 },
        { name: '价格', pattern: /(price|cost|fee|salary|wage)$/i, type: 'number', confidence: 0.85, subType: 'decimal' },
        { name: '年龄', pattern: /age$/i, type: 'integer', confidence: 0.9, subType: 'age', description: '年龄通常在0-150之间' },
        { name: '分页限制', pattern: /limit$/i, type: 'integer', confidence: 0.9, subType: 'pagination.limit', description: '分页限制' },
        { name: '分页偏移', pattern: /offset$/i, type: 'integer', confidence: 0.9, subType: 'pagination.offset', description: '分页偏移' },

        // 布尔值
        { name: '状态标志', pattern: /^(is_|has_|can_|should_|will_|needs_|requires_)/i, type: 'boolean', confidence: 0.85 },
        { name: '启用状态', pattern: /(enabled|disabled|active|inactive)$/i, type: 'boolean', confidence: 0.9 },
        { name: '验证状态', pattern: /(verified|approved|rejected)$/i, type: 'boolean', confidence: 0.8 },

        // 时间日期
        { name: '创建时间', pattern: /(created|created_at|creation_time|ctime)$/i, type: 'datetime', confidence: 0.9, format: 'YYYY-MM-DD HH:mm:ss' },
        { name: '更新时间', pattern: /(updated|updated_at|modification_time|mtime)$/i, type: 'datetime', confidence: 0.9, format: 'YYYY-MM-DD HH:mm:ss' },
        { name: '日期', pattern: /(date|_date|_at|_on)$/i, type: 'date', confidence: 0.8, format: 'YYYY-MM-DD' },
        { name: '时间', pattern: /(time|_time)$/i, type: 'time', confidence: 0.8, format: 'HH:mm:ss' },
        { name: '生日', pattern: /(birthday|birth_date|dob)$/i, type: 'date', confidence: 0.85, format: 'YYYY-MM-DD' },
        { name: '过期时间', pattern: /(expire|expires|expiration|expiry)/i, type: 'datetime', confidence: 0.8, format: 'YYYY-MM-DD HH:mm:ss' },

        // 字符串类型
        { name: '名称', pattern: /(name|title|subject|headline)$/i, type: 'string', confidence: 0.8, subType: 'name' },
        { name: '用户名', pattern: /(username|login|handle)$/i, type: 'string', confidence: 0.85, subType: 'username' },
        { name: '邮箱', pattern: /(email|e?mail|email_address)$/i, type: 'email', confidence: 0.95 },
        { name: '电话', pattern: /(phone|telephone|mobile|cell)$/i, type: 'string', confidence: 0.8, subType: 'phone' },
        { name: '地址', pattern: /(address|location|city|country|state|province|zip|postal)$/i, type: 'string', confidence: 0.8, subType: 'address' },
        { name: '描述', pattern: /(desc|description|details|content|body|text)$/i, type: 'string', confidence: 0.8, subType: 'text' },
        { name: '状态', pattern: /(status|state)$/i, type: 'string', confidence: 0.7, subType: 'status' },
        { name: '类型', pattern: /type$/i, type: 'string', confidence: 0.7, subType: 'type' },
        { name: 'URL', pattern: /(url|uri|link|href)$/i, type: 'url', confidence: 0.9 },
        { name: 'UUID', pattern: /uuid$/i, type: 'uuid', confidence: 0.95 },

        // 列表和集合
        { name: '列表', pattern: /.*_?list$/i, type: 'json', confidence: 0.8, subType: 'array' },
        { name: '数组', pattern: /.*_?array$/i, type: 'json', confidence: 0.8, subType: 'array' },
        { name: '设置', pattern: /.*_?set$/i, type: 'json', confidence: 0.8, subType: 'set' },
        { name: '选项', pattern: /(options|choices|preferences)$/i, type: 'json', confidence: 0.7, subType: 'options' },

        // JSON相关
        { name: '配置', pattern: /(config|configuration|settings|params)$/i, type: 'json', confidence: 0.8 },
        { name: '数据', pattern: /(data|metadata|payload)$/i, type: 'json', confidence: 0.7 },
        { name: '属性', pattern: /(attributes|properties|props)$/i, type: 'json', confidence: 0.7 }
    ];

    private static readonly FORMAT_SUGGESTIONS: Record<VariableType, any[]> = {
        'string': [
            'demo_string',
            'example_value',
            'test_data',
            'sample_text',
            'default_value',
            'placeholder',
            'sample'
        ],
        'number': [
            42, 100, 1.0, 0, 1, 10, 25, 50, 1000, 3.14
        ],
        'integer': [
            1, 10, 25, 42, 100, 1000, 0, -1, 999
        ],
        'boolean': [
            true, false
        ],
        'date': [
            '2024-01-01',
            '2024-12-31',
            '2000-01-01',
            '2025-06-15'
        ],
        'time': [
            '12:00:00',
            '23:59:59',
            '09:30:00',
            '14:45:30'
        ],
        'datetime': [
            '2024-01-01 12:00:00',
            '2024-12-31 23:59:59',
            '2024-06-15 14:30:00'
        ],
        'json': [
            '{"key": "value"}',
            '{"id": 1, "name": "test"}',
            '[]',
            '[1, 2, 3]'
        ],
        'uuid': [
            '550e8400-e29b-41d4-a716-446655440000',
            '123e4567-e89b-12d3-a456-426614174000'
        ],
        'email': [
            'demo@example.com',
            'test.user@domain.com',
            'user@email.org',
            'admin@company.com'
        ],
        'url': [
            'https://example.com',
            'https://api.domain.com/path',
            'http://localhost:8080'
        ],
        'null': [
            null, 'null', ''
        ]
    };

    private static customRules: TypeInferenceRule[] = [];

    /**
     * 推断变量类型
     */
    public static inferVariableType(variableName: string, context?: string): VariableInference {
        const normalizedName = variableName.toLowerCase().trim();
        const matchedRules: TypeInferenceRule[] = [];

        // 检查所有规则
        for (const rule of this.DEFAULT_RULES) {
            if (this.testPattern(rule.pattern, normalizedName)) {
                matchedRules.push(rule);
            }
        }

        // 检查用户自定义规则
        for (const rule of this.customRules) {
            if (this.testPattern(rule.pattern, normalizedName)) {
                matchedRules.push(rule);
            }
        }

        if (matchedRules.length === 0) {
            // 默认推断为string
            return {
                type: 'string',
                confidence: 0.3,
                suggestions: this.FORMAT_SUGGESTIONS.string,
                rules: []
            };
        }

        // 按置信度排序
        matchedRules.sort((a, b) => b.confidence - a.confidence);

        const bestMatch = matchedRules[0];
        const suggestions = this.generateSuggestions(bestMatch.type, bestMatch.subType);

        return {
            type: bestMatch.type,
            subType: bestMatch.subType,
            confidence: bestMatch.confidence,
            format: bestMatch.type === 'date' || bestMatch.type === 'time' || bestMatch.type === 'datetime'
                ? this.inferDateTimeFormat(bestMatch.subType)
                : undefined,
            defaultFormats: this.getDefaultFormats(bestMatch.type, bestMatch.subType),
            suggestions,
            rules: matchedRules
        };
    }

    /**
     * 测试模式匹配
     */
    private static testPattern(pattern: string | RegExp, text: string): boolean {
        if (pattern instanceof RegExp) {
            return pattern.test(text);
        }
        return text.includes(pattern.toLowerCase());
    }

    /**
     * 生成建议值
     */
    private static generateSuggestions(type: VariableType, subType?: string): any[] {
        const baseSuggestions = this.FORMAT_SUGGESTIONS[type] || this.FORMAT_SUGGESTIONS.string;

        // 根据子类型调整建议
        switch (subType) {
            case 'user.id':
                return [1, 123, 999, 1001, 5000];
            case 'pagination.limit':
                return [10, 25, 50, 100];
            case 'pagination.offset':
                return [0, 10, 20, 50];
            case 'age':
                return [18, 25, 30, 42, 65];
            case 'decimal':
                return [9.99, 19.99, 99.99, 1000.00];
            case 'username':
                return ['demo_user', 'test_user', 'john_doe', 'jane_smith'];
            case 'status':
                return ['active', 'inactive', 'pending', 'completed'];
            case 'type':
                return ['user', 'admin', 'guest', 'premium'];
            default:
                return baseSuggestions;
        }
    }

    /**
     * 推断日期时间格式
     */
    private static inferDateTimeFormat(subType?: string): string {
        switch (subType) {
            case 'date':
                return 'YYYY-MM-DD';
            case 'time':
                return 'HH:mm:ss';
            case 'datetime':
                return 'YYYY-MM-DD HH:mm:ss';
            default:
                return 'YYYY-MM-DD';
        }
    }

    /**
     * 获取默认格式选项
     */
    private static getDefaultFormats(type: VariableType, subType?: string): string[] {
        switch (type) {
            case 'string':
                return ['Plain Text', 'Email', 'URL', 'Phone Number', 'JSON String'];
            case 'number':
                return ['Decimal', 'Integer', 'Scientific Notation'];
            case 'integer':
                return ['Decimal', 'Hexadecimal', 'Binary', 'Octal'];
            case 'date':
                return ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD'];
            case 'time':
                return ['HH:mm:ss', 'HH:mm', 'HH:mm:ss.SSS', '12-hour format'];
            case 'datetime':
                return ['YYYY-MM-DD HH:mm:ss', 'ISO 8601', 'RFC 2822', 'Unix Timestamp'];
            case 'boolean':
                return ['true/false', '1/0', 'yes/no', 'on/off'];
            default:
                return ['Default'];
        }
    }

    /**
     * 添加自定义规则
     */
    public static addCustomRule(rule: TypeInferenceRule): void {
        this.customRules.push(rule);
    }

    /**
     * 添加自定义正则规则
     */
    public static addCustomRegexRule(
        name: string,
        regex: string,
        type: VariableType,
        confidence: number = 0.8,
        subType?: string
    ): void {
        try {
            const pattern = new RegExp(regex, 'i');
            this.customRules.push({
                name,
                pattern,
                type,
                confidence,
                subType
            });
        } catch (error) {
            throw new Error(`Invalid regex pattern: ${regex}`);
        }
    }

    /**
     * 获取所有规则
     */
    public static getAllRules(): TypeInferenceRule[] {
        return [...this.DEFAULT_RULES, ...this.customRules];
    }

    /**
     * 从配置加载规则
     */
    public static loadRulesFromConfig(config: any[]): void {
        this.customRules = [];
        for (const ruleConfig of config) {
            try {
                const pattern = typeof ruleConfig.pattern === 'string'
                    ? new RegExp(ruleConfig.pattern, 'i')
                    : ruleConfig.pattern;

                this.customRules.push({
                    name: ruleConfig.name,
                    pattern,
                    type: ruleConfig.type,
                    confidence: ruleConfig.confidence || 0.8,
                    subType: ruleConfig.subType,
                    description: ruleConfig.description
                });
            } catch (error) {
                console.warn(`Failed to load rule: ${ruleConfig.name}`, error);
            }
        }
    }

    /**
     * 智能变量名建议
     */
    public static suggestVariableNames(template: string, context: string = ''): string[] {
        // 从模板中提取变量名模式
        const variablePattern = /\{\{\s*([^}]+?)\s*\}\}/g;
        const matches = [...template.matchAll(variablePattern)];

        const suggestions = new Set<string>();

        for (const match of matches) {
            const expression = match[1].trim();

            // 解析变量名
            const varName = this.extractVariableName(expression);
            if (varName) {
                suggestions.add(varName);

                // 添加相关的建议
                const inference = this.inferVariableType(varName);
                if (inference.subType) {
                    const baseName = varName.replace(/_(id|name|count|time|date|status|type)$/i, '');
                    if (baseName !== varName) {
                        suggestions.add(baseName);
                    }
                }
            }
        }

        return Array.from(suggestions).sort();
    }

    /**
     * 提取变量名
     */
    private static extractVariableName(expression: string): string | null {
        // 移除过滤器
        const withoutFilters = expression.split('|')[0].trim();

        // 处理点号访问
        const baseName = withoutFilters.split('.')[0].trim();

        // 处理字典访问
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
}