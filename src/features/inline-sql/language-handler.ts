import * as vscode from 'vscode';

/**
 * 支持的编程语言类型
 */
export type LanguageType = 'python' | 'javascript' | 'typescript' | 'markdown' | 'generic';

/**
 * 引号类型
 */
export type QuoteType =
  | 'single'
  | 'double'
  | 'triple-single'
  | 'triple-double'
  | 'backtick'
  | 'template';

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
          condition: _content => _content.includes('\n'),
        },
        {
          from: 'double',
          to: 'triple-double',
          condition: _content => _content.includes('\n'),
        },
      ],
    },
    {
      id: 'javascript',
      fileExtensions: ['.js', '.jsx'],
      languageIds: ['javascript', 'javascriptreact'],
      quoteUpgradeRules: [
        {
          from: 'single',
          to: 'template',
          condition: _content => _content.includes('\n'),
        },
        {
          from: 'double',
          to: 'template',
          condition: _content => _content.includes('\n'),
        },
      ],
    },
    {
      id: 'typescript',
      fileExtensions: ['.ts', '.tsx'],
      languageIds: ['typescript', 'typescriptreact'],
      quoteUpgradeRules: [
        {
          from: 'single',
          to: 'template',
          condition: _content => _content.includes('\n'),
        },
        {
          from: 'double',
          to: 'template',
          condition: _content => _content.includes('\n'),
        },
      ],
    },
    {
      id: 'generic',
      fileExtensions: [],
      languageIds: [],
      quoteUpgradeRules: [
        {
          from: 'single',
          to: 'double',
          condition: _content => _content.includes('"'),
        },
        {
          from: 'double',
          to: 'single',
          condition: _content => _content.includes("'"),
        },
      ],
    },
    {
      id: 'markdown',
      fileExtensions: ['.md'],
      languageIds: ['markdown'],
      quoteUpgradeRules: [

        {
          from: 'triple-single',
          to: 'triple-single',
          condition: _content => _content.includes('\n'),
        },
        {
          from: 'triple-double',
          to: 'triple-double',
          condition: _content => _content.includes('\n'),
        },
        {
          from: 'single',
          to: 'single',
          condition: () => true,
        },
        {
          from: 'double',
          to: 'double',
          condition: () => true,
        },
      ],
    },
  ];

  /**
   * 检测文档的编程语言
   */
  public detectLanguage(document: vscode.TextDocument): LanguageType {
    const languageId = document.languageId.toLowerCase();
    const fileName = document.fileName.toLowerCase();


    for (const config of LanguageHandler.languageConfigs) {
      if (config.languageIds.includes(languageId)) {
        return config.id;
      }
    }


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


    if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.includes('${')) {
      return 'template';
    }

    return 'double';
  }

  /**
   * 选择合适的引号类型
   */
  public selectQuoteType(
    language: LanguageType,
    originalQuote: QuoteType,
    content: string
  ): QuoteType {
    switch (language) {
      case 'python':
        return this.selectPythonQuote(originalQuote, content);
      case 'javascript':
      case 'typescript':
        return this.selectJavaScriptQuote(originalQuote);
      case 'markdown':
        return this.selectMarkdownQuote(originalQuote);
      default:
        return this.selectGenericQuote(originalQuote);
    }
  }

  /**
   * Python语言引号选择
   */
  private selectPythonQuote(originalQuote: QuoteType, content: string): QuoteType {

    if (originalQuote === 'triple-single' || originalQuote === 'triple-double') {
      return originalQuote;
    }


    if (content.includes('\n')) {

      const hasSingleQuote = content.includes("'");
      const hasDoubleQuote = content.includes('"');

      if (hasSingleQuote && !hasDoubleQuote) {
        return 'triple-double';
      } else if (hasDoubleQuote && !hasSingleQuote) {
        return 'triple-single';
      } else {

        const singleCount = (content.match(/'/g) || []).length;
        const doubleCount = (content.match(/"/g) || []).length;


        if (singleCount === 0 && doubleCount === 0) {
          return originalQuote === 'single' ? 'triple-single' : 'triple-double';
        }

        return singleCount < doubleCount ? 'triple-single' : 'triple-double';
      }
    }


    return originalQuote;
  }

  /**
   * JavaScript/TypeScript语言引号选择
   */
  private selectJavaScriptQuote(originalQuote: QuoteType): QuoteType {


    return originalQuote;
  }

  /**
   * Markdown语言引号选择 - 保持原始引号结构
   */
  private selectMarkdownQuote(originalQuote: QuoteType): QuoteType {


    return originalQuote;
  }

  /**
   * 通用语言引号选择 - 不进行任何引号处理，保持原始内容
   */
  private selectGenericQuote(originalQuote: QuoteType): QuoteType {

    return originalQuote;
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


    if (trimmed.startsWith('"""') && trimmed.endsWith('"""')) {
      return trimmed.slice(3, -3);
    }
    if (trimmed.startsWith("'''") && trimmed.endsWith("'''")) {
      return trimmed.slice(3, -3);
    }


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


    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1);
    }


    if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }

  /**
   * 使用指定引号类型包装文本
   */
  public wrapWithQuoteType(content: string, quoteType: QuoteType, prefix: string = ''): string {
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
  public wrapLikeIntelligent(original: string, content: string, language: LanguageType): string {

    if (language === 'markdown' || language === 'generic') {
      return this.reconstructOriginalQuoteStructure(original, content);
    }

    const originalQuote = this.detectQuoteType(original);
    const prefix = this.extractPrefix(original);
    const selectedQuote = this.selectQuoteType(language, originalQuote, content);

    return this.wrapWithQuoteType(content, selectedQuote, prefix);
  }

  /**
   * 重新构建原始引号结构（用于非markdown文件）
   */
  private reconstructOriginalQuoteStructure(original: string, content: string): string {
    const trimmedOriginal = original.trim();


    if (trimmedOriginal.startsWith("'''") && trimmedOriginal.endsWith("'''")) {
      return "'''" + content + "'''";
    } else if (trimmedOriginal.startsWith('"""') && trimmedOriginal.endsWith('"""')) {
      return '"""' + content + '"""';
    } else if (trimmedOriginal.startsWith('`') && trimmedOriginal.endsWith('`')) {
      return '`' + content + '`';
    } else if (trimmedOriginal.startsWith('"') && trimmedOriginal.endsWith('"')) {
      return '"' + content + '"';
    } else if (trimmedOriginal.startsWith("'") && trimmedOriginal.endsWith("'")) {
      return "'" + content + "'";
    } else {

      return content;
    }
  }

  /**
   * 重新构建Markdown内容 - 直接返回原内容
   */
  public reconstructMarkdownContent(original: string, content: string): string {

    return content;
  }

  /**
   * 检查文本是否像SQL
   */
  public looksLikeSQL(text: string): boolean {
    const sqlKeywords = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'DROP',
      'ALTER',
      'FROM',
      'WHERE',
      'JOIN',
      'GROUP BY',
      'ORDER BY',
      'HAVING',
      'UNION',
      'INTERSECT',
      'EXCEPT',
      'WITH',
    ];

    const upperText = text.toUpperCase();


    return sqlKeywords.some(keyword => upperText.includes(keyword));
  }
}
