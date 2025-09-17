import * as vscode from 'vscode';

export interface SQLLogEntry {
	sql: string;
	parameters?: string;
	lineNumber?: number;
}

export interface ParsedSQL {
	originalSQL: string;
	injectedSQL: string;
	parameters: any[];
	placeholderType: 'question' | 'named' | 'none';
}

/**
 * 解析终端中的 SQLAlchemy 日志条目
 */
export class SQLLogParser {
	// 调试模式开关
	private static DEBUG_MODE = false;

	// 配置常量
	protected static readonly MAX_TEXT_LENGTH = 50000; // 50KB
	protected static readonly MAX_LINES = 1000;
	protected static readonly MAX_LINE_LENGTH = 1000;
	protected static readonly MAX_SQL_LINES = 20;
	protected static readonly PARAM_SEARCH_LINES = 10;

	// 优化后的正则表达式模式 - 使用预编译的正则表达式
	private static readonly TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+/;
	private static readonly SQLALCHEMY_PATTERN = /sqlalchemy\.engine\.Engine/;
	private static readonly RAW_SQL_PATTERN = /\[raw\s+sql\]/i;
	private static readonly NO_KEY_PATTERN = /\[no\s+key/i;
	private static readonly GENERATED_PATTERN = /\[generated\s+in/i;
	private static readonly PARAM_PATTERN = /\(([^)]+)\)/;

	// 简化的SQL模式 - 按优先级排序
	private static readonly SQL_PATTERNS = [
		// 1. 最具体的模式：带时间戳和特殊标记的
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+\w+\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.*)$/i,
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+\w+\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+[^\]]*\]\s*(.*)$/i,
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+\w+\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+[^\]]*\]\s*(.*)$/i,

		// 2. 标准模式
		/^\w+\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+\w+\s+sqlalchemy\.engine\.Engine\s+(.+)$/i,

		// 3. 宽松模式
		/.*?sqlalchemy\.engine\.Engine\s*[:\s]\s*(.+)/i,
	];

	// 优化后的参数模式
	private static readonly PARAM_PATTERNS = [
		// 包含SQLAlchemy头的参数行
		/.*?sqlalchemy\.engine\.Engine.*?\(([^)]+)\)/i,
		// 标准参数格式
		/^\s*\(([^)]+)\)\s*$/,
		/^\s*\{([^}]+)\}\s*$/,
		/^\s*\[([^\]]+)\]\s*$/,
	];

	// SQL关键词模式 - 用于快速识别
	private static readonly SQL_KEYWORDS = [
		'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
		'BEGIN', 'COMMIT', 'ROLLBACK', 'WITH', 'FROM', 'WHERE', 'JOIN',
		'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'AND', 'OR', 'SET',
		'VALUES', 'ON', 'USING', 'EXISTS', 'IN'
	];

	// SQL续行模式
	private static readonly SQL_CONTINUATION_PATTERNS = [
		/^FROM\s+/i, /^WHERE\s+/i, /^JOIN\s+/i, /^GROUP\s+BY\s+/i,
		/^ORDER\s+BY\s+/i, /^HAVING\s+/i, /^LIMIT\s+/i, /^AND\s+/i,
		/^OR\s+/i, /^SET\s+/i, /^VALUES\s+/i, /^ON\s+/i, /^USING\s+/i,
		/^EXISTS\s*\(/i, /^IN\s*\(/i, /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,/,
		/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s+AS\s+/i, /^(COALESCE|COUNT|SUM|AVG|MAX|MIN)\(/i
	];

	/**
	 * 设置调试模式
	 */
	public static setDebugMode(enabled: boolean): void {
		this.DEBUG_MODE = enabled;
	}

	/**
	 * 调试日志输出
	 */
	private static debugLog(message: string, ...args: any[]): void {
		if (this.DEBUG_MODE) {
			console.log(`[SQLSugar Debug] ${message}`, ...args);
		}
	}

	/**
	 * 从终端文本中解析 SQL 日志 - 优化版本
	 */
	public static parseTerminalText(text: string): SQLLogEntry[] {
		// 输入验证
		if (!text || typeof text !== 'string') {
			this.debugLog('无效的输入文本');
			return [];
		}

		// 安全限制 - 防止处理过大的文本
		if (text.length > this.MAX_TEXT_LENGTH) {
			this.debugLog('文本过大，截断处理');
			text = text.substring(0, this.MAX_TEXT_LENGTH);
		}

		this.debugLog('开始解析终端文本，长度:', text.length);

		const lines = text.split('\n');
		const entries: SQLLogEntry[] = [];

		// 限制行数处理
		const linesToProcess = Math.min(lines.length, this.MAX_LINES);
		this.debugLog('文本行数:', linesToProcess);

		// 使用流式解析器，减少内存使用
		const parser = new StreamSQLParser(lines, linesToProcess, this.DEBUG_MODE);
		return parser.parse();
	}

	/**
	 * 处理选中的文本，提取并注入SQL参数
	 */
	public static processSelectedText(text: string): ParsedSQL | null {
		try {
			// 解析SQL日志
			const entries = this.parseTerminalText(text);
			if (entries.length === 0) {
				this.debugLog('未找到有效的SQL日志条目');
				return null;
			}

			// 使用第一个找到的条目
			const entry = entries[0];
			this.debugLog('解析到SQL日志:', entry);

			// 分析占位符类型
			const placeholderType = this.analyzePlaceholderType(entry.sql);
			this.debugLog('占位符类型:', placeholderType);

			// 解析参数
			let parameters: any[] = [];
			if (entry.parameters) {
				parameters = this.parseParameters(entry.parameters, placeholderType);
				this.debugLog('解析到的参数:', parameters);
			}

			// 如果没有参数或占位符，直接返回
			if (placeholderType === 'none' || parameters.length === 0) {
				return {
					originalSQL: entry.sql,
					injectedSQL: entry.sql,
					parameters: [],
					placeholderType: 'none'
				};
			}

			// 注入参数
			const injectedSQL = this.injectParameters(entry.sql, parameters, placeholderType);
			this.debugLog('注入后的SQL:', injectedSQL);

			return {
				originalSQL: entry.sql,
				injectedSQL: injectedSQL,
				parameters: parameters,
				placeholderType: placeholderType
			};
		} catch (error) {
			this.debugLog('处理选中文本时发生错误:', error);
			return null;
		}
	}

	/**
	 * 分析占位符类型
	 */
	private static analyzePlaceholderType(sql: string): 'question' | 'named' | 'none' {
		if (!sql) {
			return 'none';
		}

		// 检查命名参数格式 :name
		if (sql.includes(':') && /:\w+/.test(sql)) {
			return 'named';
		}

		// 检查问号参数格式 ?
		if (sql.includes('?')) {
			return 'question';
		}

		// 检查 %s 格式
		if (sql.includes('%s')) {
			return 'question'; // 将 %s 也视为问号类型处理
		}

		return 'none';
	}

	/**
	 * 解析参数字符串
	 */
	private static parseParameters(paramText: string, placeholderType: 'question' | 'named' | 'none'): any[] {
		if (!paramText) {
			return [];
		}

		try {
			// 去除空白字符
			const trimmed = paramText.trim();

			// 尝试解析元组格式 (1, 'Alice', True)
			if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
				return this.parseTupleParameters(trimmed);
			}

			// 尝试解析列表格式 [1, 'Alice', True]
			if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
				return this.parseListParameters(trimmed);
			}

			// 尝试解析字典格式 {'name': 'Alice', 'age': 25}
			if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
				return this.parseDictParameters(trimmed, placeholderType);
			}

			// 如果都不是，尝试作为单个值解析
			return [this.parseSingleValue(trimmed)];
		} catch (error) {
			this.debugLog('解析参数时发生错误:', error);
			return [];
		}
	}

	/**
	 * 解析元组格式的参数
	 */
	private static parseTupleParameters(paramText: string): any[] {
		// 去除外层的括号
		const content = paramText.slice(1, -1).trim();
		if (!content) {
			return [];
		}

		// 分割参数（考虑嵌套结构和引号）
		const params = this.splitParameters(content);
		return params.map(param => this.parseSingleValue(param));
	}

	/**
	 * 解析列表格式的参数
	 */
	private static parseListParameters(paramText: string): any[] {
		// 去除外层的括号
		const content = paramText.slice(1, -1).trim();
		if (!content) {
			return [];
		}

		// 分割参数
		const params = this.splitParameters(content);
		return params.map(param => this.parseSingleValue(param));
	}

	/**
	 * 解析字典格式的参数
	 */
	private static parseDictParameters(paramText: string, placeholderType: 'question' | 'named' | 'none'): any[] {
		if (placeholderType !== 'named') {
			// 如果不是命名参数，将字典转换为值数组
			const content = paramText.slice(1, -1).trim();
			if (!content) {
				return [];
			}

			// 简单提取所有值
			const values: string[] = [];
			let inQuotes = false;
			let current = '';

			for (let i = 0; i < content.length; i++) {
				const char = content[i];
				const prevChar = i > 0 ? content[i - 1] : '';

				if (char === '"' || char === "'") {
					if (prevChar !== '\\') {
						inQuotes = !inQuotes;
					}
					current += char;
				} else if (char === ':' && !inQuotes) {
					// 跳过键的部分
					current = '';
				} else if (char === ',' && !inQuotes) {
					if (current.trim()) {
						values.push(current.trim());
					}
					current = '';
				} else {
					current += char;
				}
			}

			if (current.trim()) {
				values.push(current.trim());
			}

			return values.map(value => this.parseSingleValue(value));
		}

		// 对于命名参数，返回空数组，因为需要特殊处理
		return [];
	}

	/**
	 * 分割参数字符串（考虑嵌套结构和引号）
	 */
	private static splitParameters(content: string): string[] {
		const params: string[] = [];
		let current = '';
		let inQuotes = false;
		let inParentheses = 0;
		let inBrackets = 0;
		let inBraces = 0;

		for (let i = 0; i < content.length; i++) {
			const char = content[i];
			const prevChar = i > 0 ? content[i - 1] : '';

			// 处理引号
			if (char === '"' || char === "'") {
				if (prevChar !== '\\') {
					inQuotes = !inQuotes;
				}
				current += char;
			} else if (!inQuotes) {
				// 处理括号嵌套
				if (char === '(') {
					inParentheses++;
					current += char;
				} else if (char === ')') {
					inParentheses--;
					current += char;
				} else if (char === '[') {
					inBrackets++;
					current += char;
				} else if (char === ']') {
					inBrackets--;
					current += char;
				} else if (char === '{') {
					inBraces++;
					current += char;
				} else if (char === '}') {
					inBraces--;
					current += char;
				} else if (char === ',' && inParentheses === 0 && inBrackets === 0 && inBraces === 0) {
					// 分割参数
					params.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			} else {
				current += char;
			}
		}

		// 添加最后一个参数
		if (current.trim()) {
			params.push(current.trim());
		}

		return params;
	}

	/**
	 * 解析单个值
	 */
	protected static parseSingleValue(value: string): any {
		if (!value) {
			return null;
		}

		const trimmed = value.trim();

		// 如果是引号包围的字符串
		if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))) {
			return trimmed.slice(1, -1);
		}

		// 如果是数字
		if (/^-?\d+\.?\d*$/.test(trimmed)) {
			if (trimmed.includes('.')) {
				return parseFloat(trimmed);
			} else {
				return parseInt(trimmed, 10);
			}
		}

		// 如果是布尔值
		if (trimmed.toLowerCase() === 'true') {
			return true;
		}
		if (trimmed.toLowerCase() === 'false') {
			return false;
		}

		// 如果是 null 或 None
		if (trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'none') {
			return null;
		}

		// 默认作为字符串返回
		return trimmed;
	}

	/**
	 * 注入参数到SQL中
	 */
	private static injectParameters(sql: string, parameters: any[], placeholderType: 'question' | 'named' | 'none'): string {
		if (placeholderType === 'none' || parameters.length === 0) {
			return sql;
		}

		try {
			if (placeholderType === 'question') {
				return this.injectQuestionParameters(sql, parameters);
			} else if (placeholderType === 'named') {
				return this.injectNamedParameters(sql, parameters);
			}
		} catch (error) {
			this.debugLog('注入参数时发生错误:', error);
			return sql;
		}

		return sql;
	}

	/**
	 * 注入问号参数
	 */
	private static injectQuestionParameters(sql: string, parameters: any[]): string {
		let result = sql;
		let paramIndex = 0;

		// 替换 ? 占位符
		result = result.replace(/\?/g, () => {
			if (paramIndex < parameters.length) {
				return this.formatParameter(parameters[paramIndex++]);
			}
			return '?'; // 没有足够的参数，保持原样
		});

		// 替换 %s 占位符
		result = result.replace(/%s/g, () => {
			if (paramIndex < parameters.length) {
				return this.formatParameter(parameters[paramIndex++]);
			}
			return '%s'; // 没有足够的参数，保持原样
		});

		return result;
	}

	/**
	 * 注入命名参数（简化处理）
	 */
	private static injectNamedParameters(sql: string, parameters: any[]): string {
		// 对于命名参数，暂时按顺序注入（这不够完美，但能工作）
		let result = sql;
		let paramIndex = 0;

		result = result.replace(/:\w+/g, () => {
			if (paramIndex < parameters.length) {
				return this.formatParameter(parameters[paramIndex++]);
			}
			return '?'; // 没有足够的参数，使用问号
		});

		return result;
	}

	/**
	 * 格式化参数为SQL字面量
	 */
	protected static formatParameter(param: any): string {
		if (param === null || param === undefined) {
			return 'NULL';
		}

		if (typeof param === 'string') {
			// 转义字符串中的单引号
			return `'${param.replace(/'/g, "''")}'`;
		}

		if (typeof param === 'number') {
			return param.toString();
		}

		if (typeof param === 'boolean') {
			return param ? 'TRUE' : 'FALSE';
		}

		// 其他类型转换为字符串
		return `'${String(param).replace(/'/g, "''")}'`;
	}

	// 公共方法用于测试
	public static detectPlaceholderType(sql: string): 'question' | 'named' | 'none' {
		return this.analyzePlaceholderType(sql);
	}

	public static parseSingleValueForTest(value: string): any {
		return this.parseSingleValue(value);
	}

	public static parseTupleParametersForTest(paramText: string): any[] {
		// Handle both cases: with and without parentheses
		if (paramText.startsWith('(') && paramText.endsWith(')')) {
			return this.parseTupleParameters(paramText);
		} else {
			// Add parentheses for the test case
			return this.parseTupleParameters(`(${paramText})`);
		}
	}

	public static parseDictParametersForTest(paramText: string): any[] {
		return this.parseDictParameters(paramText, 'question');
	}

	public static formatParameterValue(param: any): string {
		return this.formatParameter(param);
	}

	/**
	 * 匹配SQL行
	 */
	protected static matchSQLLine(line: string): string | null {
		for (const pattern of this.SQL_PATTERNS) {
			const match = line.match(pattern);
			if (match && match[1]) {
				let sql = match[1].trim();
				if (sql.endsWith(';')) {
					sql = sql.slice(0, -1);
				}
				return sql;
			}
		}
		return null;
	}

	/**
	 * 匹配参数行
	 */
	protected static matchParameterLine(line: string): string | null {
		for (const pattern of this.PARAM_PATTERNS) {
			const match = line.match(pattern);
			if (match && match[1]) {
				return match[1];
			}
		}
		return null;
	}

	/**
	 * 检查是否是SQL开始
	 */
	protected static looksLikeSQLStart(text: string): boolean {
		const upperText = text.toUpperCase();

		// 快速检查SQL关键词
		for (const keyword of this.SQL_KEYWORDS) {
			if (upperText.startsWith(keyword) || upperText.includes(' ' + keyword + ' ')) {
				return true;
			}
		}

		// 检查占位符
		return text.includes('?') || text.includes(':') || text.includes('%s');
	}

	/**
	 * 检查是否是SQL续行
	 */
	protected static looksLikeSQLContinuation(text: string): boolean {
		return this.SQL_CONTINUATION_PATTERNS.some(pattern => pattern.test(text));
	}
}

/**
 * 流式SQL解析器 - 更高效的解析实现
 */
class StreamSQLParser {
	private lines: string[];
	private linesToProcess: number;
	private debugMode: boolean;
	private currentIndex: number = 0;

	// 复制需要的常量
	private readonly MAX_LINE_LENGTH = 1000;
	private readonly MAX_SQL_LINES = 20;
	private readonly PARAM_SEARCH_LINES = 10;

	constructor(lines: string[], linesToProcess: number, debugMode: boolean) {
		this.lines = lines;
		this.linesToProcess = linesToProcess;
		this.debugMode = debugMode;
	}

	/**
	 * 主要解析方法
	 */
	public parse(): SQLLogEntry[] {
		const entries: SQLLogEntry[] = [];

		while (this.currentIndex < this.linesToProcess) {
			const line = this.lines[this.currentIndex].trim();
			if (!line) {
				this.currentIndex++;
				continue;
			}

			// 安全检查
			if (line.length > this.MAX_LINE_LENGTH) {
				this.debugLog('行过长，跳过处理');
				this.currentIndex++;
				continue;
			}

			const entry = this.parseLine(line);
			if (entry) {
				entries.push(entry);
			} else {
				this.currentIndex++;
			}
		}

		return entries;
	}

	/**
	 * 解析单行日志
	 */
	private parseLine(line: string): SQLLogEntry | null {
		// 快速检查是否包含SQLAlchemy关键词
		if (!line.includes('sqlalchemy.engine.Engine')) {
			return null;
		}

		// 检查是否是完整的单行日志
		if (this.isCompleteSingleLineLog(line)) {
			return this.parseCompleteSingleLineLog(line);
		}

		// 检查是否是多行日志的开始
		if (this.isSQLAlchemyHeader(line)) {
			return this.parseMultiLineLog(line);
		}

		return null;
	}

	/**
	 * 检查是否是完整的单行日志
	 */
	private isCompleteSingleLineLog(line: string): boolean {
		return line.includes('sqlalchemy.engine.Engine') && (
			line.includes('[raw sql]') ||
			line.includes('[no key') ||
			line.includes('[generated in]')
		);
	}

	/**
	 * 检查是否是SQLAlchemy日志头
	 */
	private isSQLAlchemyHeader(line: string): boolean {
		return line.includes('sqlalchemy.engine.Engine') && !line.includes('[generated in');
	}

	/**
	 * 解析完整的单行日志
	 */
	private parseCompleteSingleLineLog(line: string): SQLLogEntry | null {
		const sqlMatch = this.matchSQLLine(line);
		if (!sqlMatch) {
			return null;
		}

		// 对于特殊模式，SQL内容应该为空
		let actualSQL = sqlMatch;
		if (line.includes('[raw sql]') || line.includes('[no key')) {
			actualSQL = '';
		}

		const entry: SQLLogEntry = {
			sql: actualSQL,
			lineNumber: this.currentIndex
		};

		// 查找参数
		const params = this.findParameters(line);
		if (params) {
			entry.parameters = params;
			this.debugLog('找到参数:', params);
		}

		// 跳过已处理的行
		this.skipProcessedLines(params);

		return entry;
	}

	/**
	 * 解析多行日志
	 */
	private parseMultiLineLog(headerLine: string): SQLLogEntry | null {
		const sqlResult = this.extractMultiLineSQL();
		if (!sqlResult) {
			this.currentIndex++;
			return null;
		}

		const entry: SQLLogEntry = {
			sql: sqlResult.sql,
			lineNumber: sqlResult.lineIndex
		};

		// 查找参数
		const params = this.findParametersInRange(sqlResult.lineIndex + 1);
		if (params) {
			entry.parameters = params;
			this.debugLog('找到参数:', params);
		}

		// 跳过已处理的行
		this.currentIndex = sqlResult.lineIndex;
		if (params) {
			this.currentIndex = Math.min(
				this.linesToProcess - 1,
				this.currentIndex + this.PARAM_SEARCH_LINES
			);
		}

		return entry;
	}

	/**
	 * 提取多行SQL
	 */
	private extractMultiLineSQL(): { sql: string; lineIndex: number } | null {
		for (let i = this.currentIndex + 1; i < Math.min(this.currentIndex + this.MAX_SQL_LINES, this.linesToProcess); i++) {
			const line = this.lines[i].trim();
			if (!line) {
				continue;
			}

			// 遇到新的日志行或性能统计行，停止查找
			if (line.includes('sqlalchemy.engine.Engine') || line.includes('[generated in')) {
				break;
			}

			// 检查是否是SQL语句的开始
			if ((SQLLogParser as any).looksLikeSQLStart(line)) {
				const sqlLines = [line];
				let lineIndex = i;

				// 收集续行
				for (let j = i + 1; j < Math.min(i + this.MAX_SQL_LINES, this.linesToProcess); j++) {
					const nextLine = this.lines[j].trim();
					if (!nextLine) {continue;}

					// 遇到新日志行、性能统计行或参数行，停止收集
					if (nextLine.includes('sqlalchemy.engine.Engine') ||
						nextLine.includes('[generated in') ||
						this.isParameterLine(nextLine)) {
						break;
					}

					// 检查是否是SQL续行
					if ((SQLLogParser as any).looksLikeSQLContinuation(nextLine)) {
						sqlLines.push(nextLine);
						lineIndex = j;
					} else {
						break;
					}
				}

				return {
					sql: sqlLines.join(' '),
					lineIndex: lineIndex
				};
			}
		}

		return null;
	}

	/**
	 * 查找参数
	 */
	private findParameters(startLine: string): string | null {
		// 首先检查同一行
		const lineMatch = this.matchParameterLine(startLine);
		if (lineMatch) {
			return lineMatch;
		}

		// 向后查找
		return this.findParametersInRange(this.currentIndex + 1);
	}

	/**
	 * 在指定范围内查找参数
	 */
	private findParametersInRange(startIndex: number): string | null {
		for (let i = startIndex; i < Math.min(startIndex + this.PARAM_SEARCH_LINES, this.linesToProcess); i++) {
			const line = this.lines[i].trim();
			if (!line) {
				continue;
			}

			const match = this.matchParameterLine(line);
			if (match && this.isParameterLine(line)) {
				return match;
			}

			// 遇到新的日志行，停止查找
			if (line.includes('sqlalchemy.engine.Engine')) {
				break;
			}
		}

		return null;
	}

	/**
	 * 跳过已处理的行
	 */
	private skipProcessedLines(paramsFound: string | null): void {
		if (paramsFound) {
			this.currentIndex = Math.min(
				this.linesToProcess - 1,
				this.currentIndex + this.PARAM_SEARCH_LINES
			);
		} else {
			this.currentIndex++;
		}
	}

	/**
	 * 检查是否是参数行
	 */
	private isParameterLine(line: string): boolean {
		return line.includes('(') || line.includes('{') || line.includes('[');
	}

	/**
	 * 匹配SQL行
	 */
	private matchSQLLine(line: string): string | null {
		return (SQLLogParser as any).matchSQLLine(line);
	}

	/**
	 * 匹配参数行
	 */
	private matchParameterLine(line: string): string | null {
		return (SQLLogParser as any).matchParameterLine(line);
	}

	/**
	 * 调试日志
	 */
	private debugLog(message: string, ...args: any[]): void {
		if (this.debugMode) {
			console.log(`[SQLSugar Debug] ${message}`, ...args);
		}
	}
}