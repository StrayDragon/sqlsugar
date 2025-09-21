import * as vscode from 'vscode';

/**
 * 支持的编程语言类型
 */
export type LanguageType = 'python' | 'javascript' | 'typescript' | 'generic';

/**
 * 引号类型
 */
export type QuoteType = 'single' | 'double' | 'triple-single' | 'triple-double' | 'backtick' | 'template';

/**
 * 编程语言接口
 */
interface LanguageConfig {
    id: LanguageType;
    fileExtensions: string[];
    languageIds: string[];
    quoteUpgradeRules: QuoteUpgradeRule[];
}

/**
 * 引号升级规则
 */
interface QuoteUpgradeRule {
    from: QuoteType;
    to: QuoteType;
    condition: (content: string) => boolean;
}

/**
 * SQLSugar语言处理器
 * 处理不同编程语言的SQL字符串检测和引号处理
 */
export class LanguageHandler {
    private static readonly languageConfigs: LanguageConfig[] = [
        {
            id: 'python',
            fileExtensions: ['.py'],
            languageIds: ['python'],
            quoteUpgradeRules: [
                {
                    from: 'single',
                    to: 'triple-single',
                    condition: (content) => content.includes('\n')
                },
                {
                    from: 'double',
                    to: 'triple-double',
                    condition: (content) => content.includes('\n')
                }
            ]
        },
        {
            id: 'javascript',
            fileExtensions: ['.js', '.jsx'],
            languageIds: ['javascript', 'javascriptreact'],
            quoteUpgradeRules: [
                {
                    from: 'single',
                    to: 'template',
                    condition: (content) => content.includes('\n')
                },
                {
                    from: 'double',
                    to: 'template',
                    condition: (content) => content.includes('\n')
                }
            ]
        },
        {
            id: 'typescript',
            fileExtensions: ['.ts', '.tsx'],
            languageIds: ['typescript', 'typescriptreact'],
            quoteUpgradeRules: [
                {
                    from: 'single',
                    to: 'template',
                    condition: (content) => content.includes('\n')
                },
                {
                    from: 'double',
                    to: 'template',
                    condition: (content) => content.includes('\n')
                }
            ]
        },
        {
            id: 'generic',
            fileExtensions: [],
            languageIds: [],
            quoteUpgradeRules: [
                {
                    from: 'single',
                    to: 'double',
                    condition: (content) => content.includes('"')
                },
                {
                    from: 'double',
                    to: 'single',
                    condition: (content) => content.includes("'")
                }
            ]
        }
    ];

    /**
     * 检测文档的编程语言
     */
    public detectLanguage(document: vscode.TextDocument): LanguageType {
        const languageId = document.languageId.toLowerCase();
        const fileName = document.fileName.toLowerCase();

        // 首先通过languageId匹配
        for (const config of LanguageHandler.languageConfigs) {
            if (config.languageIds.includes(languageId)) {
                return config.id;
            }
        }

        // 然后通过文件扩展名匹配
        for (const config of LanguageHandler.languageConfigs) {
            if (config.fileExtensions.some((ext: string) => fileName.endsWith(ext))) {
                return config.id;
            }
        }

        return 'generic';
    }

    /**
     * 检测文本的引号类型
     */
    public detectQuoteType(originalQuoted: string): QuoteType {
        const trimmed = originalQuoted.trim();

        if (trimmed.startsWith('"""') && trimmed.endsWith('"""')) {
            return 'triple-double';
        }
        if (trimmed.startsWith("'''") && trimmed.endsWith("'''")) {
            return 'triple-single';
        }
        if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
            return 'backtick';
        }
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return 'double';
        }
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return 'single';
        }

        // 检查是否为模板字符串
        if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.includes('${')) {
            return 'template';
        }

        return 'double'; // 默认双引号
    }

    /**
     * 选择合适的引号类型
     */
    public selectQuoteType(
        language: LanguageType,
        originalQuote: QuoteType,
        content: string
    ): QuoteType {
        const config = LanguageHandler.languageConfigs.find((c: any) => c.id === language) ||
                      LanguageHandler.languageConfigs.find((c: any) => c.id === 'generic')!;

        switch (language) {
            case 'python':
                return this.selectPythonQuote(originalQuote, content);
            case 'javascript':
            case 'typescript':
                return this.selectJavaScriptQuote(originalQuote, content);
            default:
                return this.selectGenericQuote(originalQuote, content);
        }
    }

    /**
     * Python语言引号选择
     */
    private selectPythonQuote(originalQuote: QuoteType, content: string): QuoteType {
        // 如果已经是三引号，保持不变
        if (originalQuote === 'triple-single' || originalQuote === 'triple-double') {
            return originalQuote;
        }

        // 如果内容包含换行符，升级到三引号
        if (content.includes('\n')) {
            // 智能选择三引号类型，避免与内容冲突
            const hasSingleQuote = content.includes("'");
            const hasDoubleQuote = content.includes('"');

            if (hasSingleQuote && !hasDoubleQuote) {
                return 'triple-double';
            } else if (hasDoubleQuote && !hasSingleQuote) {
                return 'triple-single';
            } else {
                // 如果两种引号都有或都没有，选择更少出现的
                const singleCount = (content.match(/'/g) || []).length;
                const doubleCount = (content.match(/"/g) || []).length;

                // 如果没有冲突，优先保持原始引号类型
                if (singleCount === 0 && doubleCount === 0) {
                    return originalQuote === 'single' ? 'triple-single' : 'triple-double';
                }

                return singleCount < doubleCount ? 'triple-single' : 'triple-double';
            }
        }

        // 否则保持原有引号类型
        return originalQuote;
    }

    /**
     * JavaScript/TypeScript语言引号选择
     */
    private selectJavaScriptQuote(originalQuote: QuoteType, content: string): QuoteType {
        // 保守策略：保持原有引号类型
        // 未来可以考虑升级到模板字符串
        return originalQuote;
    }

    /**
     * 通用语言引号选择
     */
    private selectGenericQuote(originalQuote: QuoteType, content: string): QuoteType {
        // 简单策略：根据内容选择引号类型
        const hasSingleQuote = content.includes("'");
        const hasDoubleQuote = content.includes('"');

        if (hasSingleQuote && !hasDoubleQuote) {
            return 'double';
        } else if (hasDoubleQuote && !hasSingleQuote) {
            return 'single';
        } else {
            return 'double'; // 默认双引号
        }
    }

    /**
     * 提取字符串前缀（如Python的f, r, u等）
     */
    public extractPrefix(original: string): string {
        const quoteMatch = original.match(/^([a-zA-Z]*)(['"`])/);
        if (quoteMatch) {
            return quoteMatch[1];
        }
        return '';
    }

    /**
     * 移除字符串的引号
     */
    public stripQuotes(text: string): string {
        const trimmed = text.trim();
        const prefix = this.extractPrefix(trimmed);

        // 处理带前缀的三引号
        if (prefix) {
            const tripleDouble = prefix + '"""';
            const tripleSingle = prefix + "'''";
            if (trimmed.startsWith(tripleDouble) && trimmed.endsWith('"""')) {
                return trimmed.slice(tripleDouble.length, -3);
            }
            if (trimmed.startsWith(tripleSingle) && trimmed.endsWith("'''")) {
                return trimmed.slice(tripleSingle.length, -3);
            }
        }

        // 处理普通三引号
        if (trimmed.startsWith('"""') && trimmed.endsWith('"""')) {
            return trimmed.slice(3, -3);
        }
        if (trimmed.startsWith("'''") && trimmed.endsWith("'''")) {
            return trimmed.slice(3, -3);
        }

        // 处理带前缀的单引号和双引号
        if (prefix) {
            const singleQuote = prefix + "'";
            const doubleQuote = prefix + '"';
            if (trimmed.startsWith(doubleQuote) && trimmed.endsWith('"')) {
                return trimmed.slice(doubleQuote.length, -1);
            }
            if (trimmed.startsWith(singleQuote) && trimmed.endsWith("'")) {
                return trimmed.slice(singleQuote.length, -1);
            }
        }

        // 处理普通的单引号和双引号
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed.slice(1, -1);
        }
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return trimmed.slice(1, -1);
        }

        // 处理反引号
        if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
            return trimmed.slice(1, -1);
        }

        return trimmed;
    }

    /**
     * 使用指定引号类型包装文本
     */
    public wrapWithQuoteType(
        content: string,
        quoteType: QuoteType,
        prefix: string = ''
    ): string {
        switch (quoteType) {
            case 'single':
                return `${prefix}'${content}'`;
            case 'double':
                return `${prefix}"${content}"`;
            case 'triple-single':
                return `${prefix}'''${content}'''`;
            case 'triple-double':
                return `${prefix}"""${content}"""`;
            case 'backtick':
            case 'template':
                return `${prefix}\`${content}\``;
            default:
                return `${prefix}"${content}"`;
        }
    }

    /**
     * 智能包装文本
     */
    public wrapLikeIntelligent(
        original: string,
        content: string,
        language: LanguageType
    ): string {
        const originalQuote = this.detectQuoteType(original);
        const prefix = this.extractPrefix(original);
        const selectedQuote = this.selectQuoteType(language, originalQuote, content);

        return this.wrapWithQuoteType(content, selectedQuote, prefix);
    }

    /**
     * 检查文本是否像SQL
     */
    public looksLikeSQL(text: string): boolean {
        const sqlKeywords = [
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
            'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING',
            'UNION', 'INTERSECT', 'EXCEPT', 'WITH'
        ];

        const upperText = text.toUpperCase();

        // 检查是否包含SQL关键字
        return sqlKeywords.some(keyword => upperText.includes(keyword));
    }
}