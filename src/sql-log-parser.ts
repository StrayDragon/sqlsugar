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
	// 匹配 SQLAlchemy 日志格式的正则表达式
	private static SQL_PATTERNS = [
		// 标准 SQLAlchemy 格式: INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
		/^INFO\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
		// 其他可能的格式
		/^DEBUG\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
		/^.*?Engine:\s*(.+)$/i
	];

	// 匹配参数行的正则表达式
	private static PARAM_PATTERNS = [
		// 标准格式: ('Alice',)
		/^\s*\(([^)]+)\)\s*$/,
		// 字典格式: {'user_id': 123}
		/^\s*\{([^}]+)\}\s*$/,
		// 列表格式: [1, 'Alice']
		/^\s*\[([^\]]+)\]\s*$/
	];

	/**
	 * 从终端文本中解析 SQL 日志
	 */
	public static parseTerminalText(text: string): SQLLogEntry[] {
		const lines = text.split('\n');
		const entries: SQLLogEntry[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) {continue;}

			// 尝试匹配 SQL 行
			const sqlMatch = this.matchSQLLine(line);
			if (sqlMatch) {
				const entry: SQLLogEntry = {
					sql: sqlMatch,
					lineNumber: i
				};

				// 查找下一行的参数
				if (i + 1 < lines.length) {
					const nextLine = lines[i + 1].trim();
					const paramMatch = this.matchParameterLine(nextLine);
					if (paramMatch) {
						entry.parameters = paramMatch;
					}
				}

				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * 匹配 SQL 行
	 */
	private static matchSQLLine(line: string): string | null {
		for (const pattern of this.SQL_PATTERNS) {
			const match = line.match(pattern);
			if (match && match[1]) {
				return match[1].trim();
			}
		}
		return null;
	}

	/**
	 * 匹配参数行
	 */
	private static matchParameterLine(line: string): string | null {
		// 跳过时间戳行，如: [generated in 0.00015s]
		if (line.includes('[generated in') || line.includes('{}')) {
			return null;
		}

		for (const pattern of this.PARAM_PATTERNS) {
			const match = line.match(pattern);
			if (match && match[1]) {
				return match[1].trim();
			}
		}
		return null;
	}

	/**
	 * 解析参数字符串为 JavaScript 对象
	 */
	public static parseParameters(paramString: string): any[] {
		try {
			// 处理元组格式: ('Alice', 25, True)
			if (paramString.startsWith('(') && paramString.endsWith(')')) {
				return this.parseTupleParameters(paramString.slice(1, -1));
			}

			// 处理字典格式: {'user_id': 123, 'name': 'Alice'}
			if (paramString.startsWith('{') && paramString.endsWith('}')) {
				return this.parseDictParameters(paramString.slice(1, -1));
			}

			// 处理列表格式: [1, 'Alice']
			if (paramString.startsWith('[') && paramString.endsWith(']')) {
				return this.parseListParameters(paramString.slice(1, -1));
			}

			// 简单的单个值
			return [this.parseSingleValue(paramString)];
		} catch (error) {
			console.warn('Failed to parse parameters:', paramString, error);
			return [];
		}
	}

	/**
	 * 解析元组格式的参数
	 */
	public static parseTupleParameters(tupleStr: string): any[] {
		const params: any[] = [];
		let current = '';
		let inQuotes = false;
		let quoteChar = '';
		let depth = 0;

		for (let i = 0; i < tupleStr.length; i++) {
			const char = tupleStr[i];

			if (char === quoteChar && inQuotes) {
				inQuotes = false;
				current += char;
			} else if ((char === '"' || char === "'") && !inQuotes) {
				inQuotes = true;
				quoteChar = char;
				current += char;
			} else if (char === '(' && !inQuotes) {
				depth++;
				current += char;
			} else if (char === ')' && !inQuotes) {
				depth--;
				current += char;
			} else if (char === ',' && !inQuotes && depth === 0) {
				params.push(this.parseSingleValue(current.trim()));
				current = '';
			} else {
				current += char;
			}
		}

		// 添加最后一个参数
		if (current.trim()) {
			params.push(this.parseSingleValue(current.trim()));
		}

		return params;
	}

	/**
	 * 解析字典格式的参数
	 */
	public static parseDictParameters(dictStr: string): any[] {
		// 对于字典格式，我们需要按占位符名称排序
		const pairs = dictStr.split(',');
		const params: any[] = [];

		for (const pair of pairs) {
			const [key, value] = pair.split(':').map(s => s.trim());
			if (key && value) {
				// 移除键的引号
				const cleanKey = key.replace(/^["']|["']$/g, '');
				params.push({
					name: cleanKey,
					value: this.parseSingleValue(value)
				});
			}
		}

		return params;
	}

	/**
	 * 解析列表格式的参数
	 */
	private static parseListParameters(listStr: string): any[] {
		const items = listStr.split(',');
		return items.map(item => this.parseSingleValue(item.trim()));
	}

	/**
	 * 解析单个参数值
	 */
	public static parseSingleValue(value: string): any {
		if (!value) {return null;}

		// 移除引号
		const trimmed = value.trim();

		// 字符串
		if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))) {
			return trimmed.slice(1, -1);
		}

		// 布尔值
		if (trimmed.toLowerCase() === 'true') {return true;}
		if (trimmed.toLowerCase() === 'false') {return false;}

		// None/null
		if (trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'null') {
			return null;
		}

		// 数字
		if (/^-?\d+$/.test(trimmed)) {
			return parseInt(trimmed, 10);
		}

		if (/^-?\d+\.\d+$/.test(trimmed)) {
			return parseFloat(trimmed);
		}

		// 默认返回字符串
		return trimmed;
	}

	/**
	 * 检测占位符类型
	 */
	public static detectPlaceholderType(sql: string): 'question' | 'named' | 'none' {
		if (sql.includes('?')) {
			return 'question';
		}
		if (sql.includes(':') && /:\w+/.test(sql)) {
			return 'named';
		}
		return 'none';
	}

	/**
	 * 注入参数到 SQL 中
	 */
	public static injectParameters(sql: string, parameters: any[]): ParsedSQL {
		const placeholderType = this.detectPlaceholderType(sql);
		let injectedSQL = sql;

		try {
			switch (placeholderType) {
				case 'question':
					injectedSQL = this.injectQuestionParameters(sql, parameters);
					break;
				case 'named':
					injectedSQL = this.injectNamedParameters(sql, parameters);
					break;
				case 'none':
					// 如果没有占位符，直接返回原 SQL
					break;
			}
		} catch (error) {
			console.warn('Failed to inject parameters:', error);
			injectedSQL = sql;
		}

		return {
			originalSQL: sql,
			injectedSQL,
			parameters,
			placeholderType
		};
	}

	/**
	 * 注入问号占位符参数
	 */
	private static injectQuestionParameters(sql: string, parameters: any[]): string {
		let result = sql;
		let paramIndex = 0;

		// 替换每个 ? 占位符
		result = result.replace(/\?/g, () => {
			if (paramIndex < parameters.length) {
				const param = parameters[paramIndex++];
				return this.formatParameterValue(param);
			}
			return '?';
		});

		return result;
	}

	/**
	 * 注入命名参数
	 */
	private static injectNamedParameters(sql: string, parameters: any[]): string {
		let result = sql;

		// 参数是字典格式
		if (parameters.length > 0 && typeof parameters[0] === 'object' && parameters[0].name) {
			for (const param of parameters) {
				const paramName = param.name;
				const paramValue = param.value;
				const regex = new RegExp(`:${paramName}\\b`, 'g');
				result = result.replace(regex, this.formatParameterValue(paramValue));
			}
		}

		return result;
	}

	/**
	 * 格式化参数值为 SQL 字面量
	 */
	public static formatParameterValue(value: any): string {
		if (value === null || value === undefined) {
			return 'NULL';
		}

		if (typeof value === 'string') {
			// 转义字符串中的单引号
			const escaped = value.replace(/'/g, "''");
			return `'${escaped}'`;
		}

		if (typeof value === 'number') {
			return value.toString();
		}

		if (typeof value === 'boolean') {
			return value ? 'TRUE' : 'FALSE';
		}

		// 其他类型转换为字符串
		const stringValue = String(value);
		const escaped = stringValue.replace(/'/g, "''");
		return `'${escaped}'`;
	}

	/**
	 * 从选中的终端文本中提取并处理 SQL
	 */
	public static processSelectedText(selectedText: string): ParsedSQL | null {
		// 解析终端文本
		const entries = this.parseTerminalText(selectedText);

		if (entries.length === 0) {
			return null;
		}

		// 处理第一个找到的 SQL 条目
		const entry = entries[0];
		let parameters: any[] = [];

		if (entry.parameters) {
			parameters = this.parseParameters(entry.parameters);
		}

		return this.injectParameters(entry.sql, parameters);
	}
}