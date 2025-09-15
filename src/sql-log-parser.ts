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

	// 匹配 SQLAlchemy 日志格式的正则表达式
	private static SQL_PATTERNS = [
		// 带时间戳的特殊格式 - 需要在通用时间戳格式之前检查
		// 带 [raw sql] 的格式
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.*)$/i,
		// 带 [no key] 的格式
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*(.*)$/i,
		// 带 [generated in] 的格式
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.*)$/i,
		// 标准 SQLAlchemy 格式: INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
		/^INFO\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
		// DEBUG 格式
		/^DEBUG\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
		// 带时间戳的格式 (无冒号): 2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT ...
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s*(.*)$/i,
		// 带时间戳的DEBUG格式 (无冒号): 2025-09-15 22:37:56,917 DEBUG sqlalchemy.engine.Engine SELECT ...
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+DEBUG\s+sqlalchemy\.engine\.Engine\s*(.*)$/i,
		// 不带时间戳的特殊格式
		/^INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.+)$/i,
		/^INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.+)$/i,
		/^INFO\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*(.+)$/i,
		// 其他可能的格式
		/^.*?Engine:\s*(.+)$/i,
		// 更宽松的格式 - 包含各种SQL关键词
		/^(?:.*?\s)?(SELECT\s+.+|INSERT\s+.+|UPDATE\s+.+|DELETE\s+.+|CREATE\s+.+|ALTER\s+.+|DROP\s+.+|BEGIN|COMMIT|ROLLBACK|WITH\s+RECURSIVE)$/i,
		// 包含参数的SQL行
		/^(.*?\?.*|.*?:\w+.*)$/,
		// 多行 SQL 续行模式
		/^(?:FROM\s+|WHERE\s+|JOIN\s+|GROUP\s+BY\s+|ORDER\s+BY\s+|HAVING\s+|LIMIT\s+|AND\s+|OR\s+|SET\s+|VALUES\s+|ON\s+|USING\s+|EXISTS\s*\(.*?\)|IN\s*\(.*?\))\s*.+/i,
	];

	// 匹配参数行的正则表达式
	private static PARAM_PATTERNS = [
		// 标准 SQLAlchemy 格式: (1, 2, 3)
		/^\s*\(([^)]+)\)\s*$/,
		// 字典格式: {'user_id': 123}
		/^\s*\{([^}]+)\}\s*$/,
		// 列表格式: [1, 'Alice']
		/^\s*\[([^\]]+)\]\s*$/,
		// 包含 SQLAlchemy 性能统计的参数行: INFO sqlalchemy.engine.Engine [generated in 0.00008s] (parameters)
		/^.*?sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*\(([^)]+)\)\s*$/,
		// 包含 [raw sql] 的参数行
		/^.*?sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*\(([^)]+)\)\s*$/,
		// 包含 [no key] 的参数行
		/^.*?sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*\(([^)]+)\)\s*$/,
		// 包含 SQLAlchemy 日志头的参数行
		/^.*?sqlalchemy\.engine\.Engine\s*\(([^)]+)\)\s*$/,
		// 多行参数 - 继续上一行，但要确保不是SQL语句
		/^\s*([^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|BEGIN|COMMIT|ROLLBACK|WITH)\s].+)$/,
		// 空参数格式
		/^\s*\(\s*\)\s*$/,
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
	 * 从终端文本中解析 SQL 日志
	 */
	public static parseTerminalText(text: string): SQLLogEntry[] {
		// 输入验证
		if (!text || typeof text !== 'string') {
			this.debugLog('无效的输入文本');
			return [];
		}

		// 安全限制 - 防止处理过大的文本
		const MAX_TEXT_LENGTH = 50000; // 50KB
		const MAX_LINES = 1000;

		if (text.length > MAX_TEXT_LENGTH) {
			this.debugLog('文本过大，截断处理');
			text = text.substring(0, MAX_TEXT_LENGTH);
		}

		this.debugLog('开始解析终端文本，长度:', text.length);

		const lines = text.split('\n');
		const entries: SQLLogEntry[] = [];

		// 限制行数处理
		const linesToProcess = Math.min(lines.length, MAX_LINES);

		this.debugLog('文本行数:', linesToProcess);

		for (let i = 0; i < linesToProcess; i++) {
			const line = lines[i].trim();
			if (!line) {continue;}

			// 安全检查 - 防止处理过长的行
			if (line.length > 1000) {
				this.debugLog('行过长，跳过处理');
				continue;
			}

			// 检查是否是完整的单行日志格式（包含 [raw sql], [no key], [generated in]）
			const isCompleteSingleLineLog = line.includes('sqlalchemy.engine.Engine') &&
				(line.includes('[raw sql]') || line.includes('[no key') || line.includes('[generated in]'));

			// 检查是否是 SQLAlchemy 日志头（SQL 可能在下一行）
			const isSQLAlchemyHeader = line.includes('sqlalchemy.engine.Engine') && !line.includes('[generated in');

			
			if (isCompleteSingleLineLog) {
				this.debugLog('发现完整的单行日志:', line);

				// 直接匹配该行的SQL内容
				const sqlMatch = this.matchSQLLine(line);
				if (sqlMatch !== null) {
					// 对于 [raw sql] 和 [no key] 模式，SQL内容应该为空
					let actualSQL = sqlMatch;
					if (line.includes('[raw sql]') || line.includes('[no key')) {
						actualSQL = '';
					}

					this.debugLog('单行日志SQL内容:', actualSQL);

					const entry: SQLLogEntry = {
						sql: actualSQL,
						lineNumber: i
					};

					// 查找参数（在同一行或后续行）
					let paramText = '';
					let foundParams = false;

					// 首先检查同一行是否有参数
					const paramMatch = this.matchParameterLine(line);
					if (paramMatch) {
						paramText = paramMatch;
						foundParams = true;
						this.debugLog('在同一行找到参数:', paramMatch);
					} else {
						// 向后查找参数行
						for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
							const nextLine = lines[j].trim();
							if (!nextLine) { continue; }

							this.debugLog('检查参数行:', nextLine);

							const paramMatch = this.matchParameterLine(nextLine);
							if (paramMatch && (nextLine.includes('(') || nextLine.includes('{') || nextLine.includes('['))) {
								paramText = paramMatch;
								foundParams = true;
								this.debugLog('找到参数:', paramMatch);
								break;
							} else if (nextLine.includes('sqlalchemy.engine.Engine')) {
								break;
							}
						}
					}

					if (paramText) {
						entry.parameters = paramText;
						this.debugLog('最终参数文本:', paramText);
					}

					entries.push(entry);

					// 跳过已处理的行
					let lastProcessedLine = i;
					if (foundParams) {
						for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
							const nextLine = lines[j].trim();
							if (!nextLine) { continue; }

							if (nextLine.includes('sqlalchemy.engine.Engine')) {
								break;
							}

							const paramMatch = this.matchParameterLine(nextLine);
							if (paramMatch && (nextLine.includes('(') || nextLine.includes('{') || nextLine.includes('['))) {
								lastProcessedLine = j;
							}
						}
					}

					i = lastProcessedLine;
					continue;
				}
			} else if (isSQLAlchemyHeader) {
				this.debugLog('发现 SQLAlchemy 日志头:', line);
				
				let actualSQL = '';
				let lineIndex = i;
				
				// 查找SQL语句，从下一行开始
				for (let k = i + 1; k < Math.min(i + 20, lines.length); k++) {
					const nextLine = lines[k].trim();
					if (!nextLine) {
						continue;
					}
					
					// 如果遇到新的日志行或性能统计行，停止查找
					if (nextLine.includes('sqlalchemy.engine.Engine') || 
						nextLine.includes('[generated in')) {
						break;
					}
					
					// 检查是否是SQL语句的开始或参数行
					if (this.looksLikeSQLStart(nextLine)) {
						// 找到SQL语句开始
						actualSQL = nextLine;
						lineIndex = k;
						this.debugLog('找到SQL开始:', actualSQL);
						
						// 继续收集多行SQL
						for (let l = k + 1; l < Math.min(k + 20, lines.length); l++) {
							const continuationLine = lines[l].trim();
							if (!continuationLine) {
								continue;
							}
							
							// 如果遇到新的日志行、性能统计行或参数行，停止收集
							if (continuationLine.includes('sqlalchemy.engine.Engine') || 
								continuationLine.includes('[generated in') ||
								continuationLine.match(/^\(.*\)$/) ||
								continuationLine.match(/^\{.*\}$/) ||
								continuationLine.match(/^\[.*\]$/)) {
								break;
							}
							
							// 如果是SQL续行，添加到SQL中
							if (this.looksLikeSQLContinuation(continuationLine)) {
								actualSQL += ' ' + continuationLine;
								this.debugLog('添加SQL续行:', continuationLine);
								lineIndex = l;
							} else {
								break;
							}
						}
						break;
					}
				}
				
				if (!actualSQL || actualSQL.trim() === '') {
					this.debugLog('未找到有效的SQL语句，跳过这个日志条目');
					continue;
				}
				
				this.debugLog('最终SQL:', actualSQL);
				
				const entry: SQLLogEntry = {
					sql: actualSQL,
					lineNumber: lineIndex
				};

				// 查找参数行（可能在后面的几行中）
				let paramText = '';
				let foundParams = false;
				
				// 向后查找参数行，最多查找10行，从 SQL 的最后一行开始
				for (let j = lineIndex + 1; j < Math.min(lineIndex + 11, lines.length); j++) {
					const nextLine = lines[j].trim();
					if (!nextLine) { continue; }
					
					this.debugLog('检查参数行:', nextLine);
					
					// 检查是否是参数行 - 必须匹配括号格式
					const paramMatch = this.matchParameterLine(nextLine);
					if (paramMatch && (nextLine.includes('(') || nextLine.includes('{') || nextLine.includes('['))) {
						paramText = paramMatch; // 只取第一个参数行
						foundParams = true;
						this.debugLog('找到参数:', paramMatch);
						break; // 找到参数后立即停止
					} else if (nextLine.includes('[generated in') && !nextLine.includes('(')) {
						// 只有在没有参数的情况下才停止查找
						this.debugLog('遇到纯性能统计行，停止查找');
						break;
					} else if (nextLine.includes('sqlalchemy.engine.Engine')) {
						this.debugLog('遇到新的日志行，停止查找');
						break;
					}
				}

				if (paramText) {
					entry.parameters = paramText;
					this.debugLog('最终参数文本:', paramText);
					this.debugLog('参数文本原始值:', `"${paramText}"`);
					this.debugLog('参数文本长度:', paramText.length);
				}

				entries.push(entry);
				
				// 跳过已经处理的行，包括SQL行和参数行
				let lastProcessedLine = lineIndex;
				if (foundParams) {
					// 找到参数的最后一行
					for (let j = lineIndex + 1; j < Math.min(lineIndex + 11, lines.length); j++) {
						const nextLine = lines[j].trim();
						if (!nextLine) { continue; }
						
						if (nextLine.includes('[generated in') || 
							nextLine.includes('sqlalchemy.engine.Engine')) {
							break;
						}
						
						const paramMatch = this.matchParameterLine(nextLine);
						if (paramMatch && (nextLine.includes('(') || nextLine.includes('{') || nextLine.includes('['))) {
							lastProcessedLine = j;
						}
					}
				}
				
				this.debugLog('跳过已处理的行，从', i, '到', lastProcessedLine);
				i = lastProcessedLine;
			} else {
				this.debugLog('行不匹配任何SQL模式:', line);
			}
		}

		this.debugLog('解析完成，找到条目数:', entries.length);
		return entries;
	}

	/**
	 * 匹配 SQL 行
	 */
	private static matchSQLLine(line: string): string | null {
		for (const pattern of this.SQL_PATTERNS) {
			const match = line.match(pattern);
			if (match && match[1]) {
				let sql = match[1].trim();
				
				// 如果SQL行以分号结束，移除分号
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
	private static matchParameterLine(line: string): string | null {
		// 跳过纯时间戳行，如: [generated in 0.00015s]
		if (line.includes('[generated in') && !line.includes('(')) {
			return null;
		}

		// 跳过 [raw sql] 行且没有参数
		if (line.includes('[raw sql]') && !line.includes('(')) {
			return null;
		}

		// 跳过空行或只有空格的行
		if (!line.trim()) {
			return null;
		}

		// 跳过明显不是参数的行（如SQL语句或其他日志）
		if (line.match(/^(SELECT\s|INSERT\s|UPDATE\s|DELETE\s|CREATE\s|ALTER\s|DROP\s|BEGIN\s|COMMIT\s|ROLLBACK\s|WITH\s)/i)) {
			return null;
		}

		// 特别处理包含性能统计的参数行
		if (line.includes('[generated in') && line.includes('(')) {
			// 从行中提取参数部分（包含括号）
			const paramMatch = line.match(/\(([^)]+)\)/);
			if (paramMatch) {
				// 返回完整的括号格式，以便正确识别为元组
				return `(${paramMatch[1].trim()})`;
			}
		}

		// 特别处理包含 [raw sql] 的参数行
		if (line.includes('[raw sql]') && line.includes('(')) {
			const paramMatch = line.match(/\(([^)]+)\)/);
			if (paramMatch) {
				return `(${paramMatch[1].trim()})`;
			}
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
		// 输入验证
		if (!paramString || typeof paramString !== 'string') {
			this.debugLog('无效的参数字符串');
			return [];
		}

		// 安全限制 - 防止处理过长的参数字符串
		if (paramString.length > 10000) {
			this.debugLog('参数字符串过长，跳过处理');
			return [];
		}

		this.debugLog('开始解析参数字符串:', `"${paramString}"`);
		this.debugLog('参数字符串长度:', paramString.length);

		try {
			// 处理元组格式: ('Alice', 25, True)
			if (paramString.startsWith('(') && paramString.endsWith(')')) {
				this.debugLog('检测到元组格式');
				const result = this.parseTupleParameters(paramString.slice(1, -1));
				this.debugLog('元组解析结果:', result);
				return result;
			}

			// 处理字典格式: {'user_id': 123, 'name': 'Alice'}
			if (paramString.startsWith('{') && paramString.endsWith('}')) {
				this.debugLog('检测到字典格式');
				const result = this.parseDictParameters(paramString.slice(1, -1));
				this.debugLog('字典解析结果:', result);
				return result;
			}

			// 处理列表格式: [1, 'Alice']
			if (paramString.startsWith('[') && paramString.endsWith(']')) {
				this.debugLog('检测到列表格式');
				const result = this.parseListParameters(paramString.slice(1, -1));
				this.debugLog('列表解析结果:', result);
				return result;
			}

			// 简单的单个值
			this.debugLog('检测到单个值格式');
			const result = [this.parseSingleValue(paramString)];
			this.debugLog('单个值解析结果:', result);
			return result;
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
		let escapeNext = false;

		// 移除可能的外层括号并处理空字符串
		let cleanStr = tupleStr.trim();
		if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
			cleanStr = cleanStr.slice(1, -1).trim();
		}

		for (let i = 0; i < cleanStr.length; i++) {
			const char = cleanStr[i];

			if (escapeNext) {
				current += char;
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				current += char;
				continue;
			}

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
				if (current.trim()) {
					params.push(this.parseSingleValue(current.trim()));
				}
				current = '';
			} else {
				current += char;
			}
		}

		// 添加最后一个参数（如果有内容）
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

		// 空值
		if (trimmed === '' || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'null') {
			return null;
		}

		// 字符串（处理转义字符）
		if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))) {
			const content = trimmed.slice(1, -1);
			// 处理转义字符
			return content.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}

		// 布尔值
		if (trimmed.toLowerCase() === 'true') {return true;}
		if (trimmed.toLowerCase() === 'false') {return false;}

		// 数字（整数）
		if (/^-?\d+$/.test(trimmed)) {
			return parseInt(trimmed, 10);
		}

		// 数字（浮点数）
		if (/^-?\d+\.\d+$/.test(trimmed)) {
			return parseFloat(trimmed);
		}

		// 科学计数法
		if (/^-?\d+\.\d+[eE][+-]?\d+$/.test(trimmed)) {
			return parseFloat(trimmed);
		}

		// 处理 Python 特有的格式
		if (trimmed.toLowerCase() === 'true') {return true;}
		if (trimmed.toLowerCase() === 'false') {return false;}
		if (trimmed.toLowerCase() === 'none') {return null;}

		// 处理时间戳格式 (YYYY-MM-DD HH:MM:SS.ssssss)
		const timestampRegex = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+$/;
		if (timestampRegex.test(trimmed)) {
			return `'${trimmed}'`;
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

		this.debugLog('开始参数注入:');
		this.debugLog('- SQL:', sql);
		this.debugLog('- 参数:', JSON.stringify(parameters));
		this.debugLog('- 占位符类型:', placeholderType);

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

		this.debugLog('- 注入后SQL:', injectedSQL);

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

		// 输入验证 - 防止 SQL 注入
		if (typeof value === 'string' && this.containsPotentialSQLInjection(value)) {
			// 对于可疑的 SQL 注入尝试，进行更严格的转义
			const escaped = this.escapeStringForSQL(value);
			return `'${escaped}'`;
		}

		if (typeof value === 'string') {
			// 转义字符串中的单引号和其他特殊字符
			const escaped = this.escapeStringForSQL(value);
			return `'${escaped}'`;
		}

		if (typeof value === 'number') {
			// 处理特殊浮点数值
			if (value === Infinity || value === -Infinity || isNaN(value)) {
				return 'NULL';
			}
			return value.toString();
		}

		if (typeof value === 'boolean') {
			return value ? '1' : '0';
		}

		// 处理日期时间对象
		if (value instanceof Date) {
			return `'${value.toISOString()}'`;
		}

		// 处理数组和对象（JSON字符串）
		if (typeof value === 'object') {
			try {
				const stringValue = JSON.stringify(value);
				const escaped = this.escapeStringForSQL(stringValue);
				return `'${escaped}'`;
			} catch (error) {
				// 如果序列化失败，返回 NULL
				return 'NULL';
			}
		}

		// 其他类型转换为字符串
		const stringValue = String(value);
		const escaped = this.escapeStringForSQL(stringValue);
		return `'${escaped}'`;
	}

	/**
	 * 检查字符串是否包含潜在的 SQL 注入攻击
	 */
	private static containsPotentialSQLInjection(value: string): boolean {
		const sqlInjectionPatterns = [
			/--/,           // SQL 注释
			/;/,            // SQL 语句分隔符
			/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|EXEC)\b/i, // SQL 关键字
			/\b(OR\s+\d+\s*=\s*\d+)\b/i,  // OR 1=1 攻击
			/\b(AND\s+\d+\s*=\s*\d+)\b/i, // AND 1=1 攻击
			/\b(XOR\s+\d+\s*=\s*\d+)\b/i, // XOR 1=1 攻击
			/\b(WAITFOR\s+DELAY)\b/i,     // SQL Server 延迟攻击
			/\b(SLEEP\()\b/i,             // MySQL 函数攻击
			/\b(BENCHMARK\()\b/i,         // MySQL 基准测试攻击
			/\b(LOAD_FILE\()\b/i,         // 文件读取攻击
			/\b(INTO\s+(OUTFILE|DUMPFILE))\b/i, // 文件写入攻击
		];

		return sqlInjectionPatterns.some(pattern => pattern.test(value));
	}

	/**
	 * 转义字符串用于 SQL 字面量
	 */
	private static escapeStringForSQL(value: string): string {
		return value
			.replace(/'/g, "''")           // 转义单引号
			.replace(/\\/g, "\\\\")        // 转义反斜杠
			.replace(/"/g, '\\"')          // 转义双引号
			.replace(/\n/g, '\\n')         // 转义换行符
			.replace(/\r/g, '\\r')         // 转义回车符
			.replace(/\t/g, '\\t')         // 转义制表符
			.replace(/\x00/g, '\\0');      // 转义空字符
	}

	/**
	 * 检查文本是否像 SQL 语句的开始
	 */
	private static looksLikeSQLStart(text: string): boolean {
		const sqlStartPatterns = [
			/^SELECT(\s+|$)/i,  // SELECT 后面有空格或者行结束
			/^INSERT\s+/i,
			/^UPDATE\s+/i,
			/^DELETE\s+/i,
			/^CREATE\s+/i,
			/^ALTER\s+/i,
			/^DROP\s+/i,
			/^BEGIN\s+/i,
			/^COMMIT\s+/i,
			/^ROLLBACK\s+/i,
			/^WITH\s+/i,
			// 允许缩进的 SQL 开始（多行情况）
			/^\s*SELECT(\s+|$)/i,
			/^\s*INSERT\s+/i,
			/^\s*UPDATE\s+/i,
			/^\s*DELETE\s+/i,
			/^\s*CREATE\s+/i,
			/^\s*ALTER\s+/i,
			/^\s*DROP\s+/i,
			/^\s*BEGIN\s+/i,
			/^\s*COMMIT\s+/i,
			/^\s*ROLLBACK\s+/i,
			/^\s*WITH\s+/i
		];

		return sqlStartPatterns.some(pattern => pattern.test(text));
	}

	/**
	 * 检查文本是否像 SQL 语句的续行
	 */
	private static looksLikeSQLContinuation(text: string): boolean {
		const sqlContinuationPatterns = [
			/^FROM\s+/i,
			/^WHERE\s+/i,
			/^JOIN\s+/i,
			/^INNER\s+JOIN\s+/i,
			/^LEFT\s+JOIN\s+/i,
			/^RIGHT\s+JOIN\s+/i,
			/^FULL\s+JOIN\s+/i,
			/^GROUP\s+BY\s+/i,
			/^ORDER\s+BY\s+/i,
			/^HAVING\s+/i,
			/^LIMIT\s+/i,
			/^AND\s+/i,
			/^OR\s+/i,
			/^SET\s+/i,
			/^VALUES\s+/i,
			/^ON\s+/i,
			/^USING\s+/i,
			// 更宽松的匹配（不只是行首）
			/\s+VALUES\s+/i,
			/\s+SET\s+/i,
			/\s+WHERE\s+/i,
			/\s+JOIN\s+/i,
			/\s+GROUP\s+BY\s+/i,
			/\s+ORDER\s+BY\s+/i,
			/\s+HAVING\s+/i,
			/\s+LIMIT\s+/i,
			/\s+FROM\s+/i,
			/\s+INTO\s+/i,
			/\s+TABLE\s+/i,
			/\s+AND\s+/i,
			/\s+OR\s+/i,
			/\s+ON\s+/i,
			// 包含占位符
			/\?/,
			/:\w+/,
			/%s/,
			// 包含括号
			/\(.*\)/,
			// 包含逗号分隔的列表
			/,\s*[a-zA-Z_]/,
		];

		return sqlContinuationPatterns.some(pattern => pattern.test(text));
	}

	/**
	 * 从选中的终端文本中提取并处理 SQL
	 */
	public static processSelectedText(selectedText: string): ParsedSQL | null {
		const startTime = performance.now();

		// 解析终端文本
		const entries = this.parseTerminalText(selectedText);

		if (entries.length === 0) {
			this.debugLog('没有找到有效的 SQL 条目');
			return null;
		}

		// 限制处理的条目数量以提高性能
		const maxEntriesToProcess = 10;
		const entriesToProcess = Math.min(entries.length, maxEntriesToProcess);

		for (let i = 0; i < entriesToProcess; i++) {
			const entry = entries[i];

			try {
				let parameters: any[] = [];

				if (entry.parameters) {
					parameters = this.parseParameters(entry.parameters);
				}

				const result = this.injectParameters(entry.sql, parameters);

				if (result) {
					const endTime = performance.now();
					this.debugLog(`SQL 解析完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);
					return result;
				}
			} catch (error) {
				this.debugLog(`处理第 ${i + 1} 个条目时出错:`, error);
				continue;
			}
		}

		this.debugLog('没有成功解析的 SQL 条目');
		return null;
	}
}