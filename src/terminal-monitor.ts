import * as vscode from 'vscode';

/**
 * 终端内容监听器
 * 监听终端输出并缓存内容，支持获取选中文本
 */
export class TerminalMonitor {
	private static instance: TerminalMonitor;
	private terminalBuffer: Map<string, string[]> = new Map();
	private disposables: vscode.Disposable[] = [];
	private cleanupInterval?: NodeJS.Timeout;
	private readonly MAX_BUFFER_SIZE = 500; // 减小缓冲区大小
	private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5分钟清理一次

	private constructor() {
		this.setupTerminalListeners();
		this.startCleanupTimer();
	}

	public static getInstance(): TerminalMonitor {
		if (!TerminalMonitor.instance) {
			TerminalMonitor.instance = new TerminalMonitor();
		}
		return TerminalMonitor.instance;
	}

	/**
	 * 设置终端监听器
	 */
	private setupTerminalListeners(): void {
		// 监听终端创建
		this.disposables.push(
			vscode.window.onDidOpenTerminal(this.onTerminalOpened, this)
		);

		// 监听终端关闭
		this.disposables.push(
			vscode.window.onDidCloseTerminal(this.onTerminalClosed, this)
		);

		// 检查是否支持 terminalDataWriteEvent API
		if (this.isTerminalDataWriteEventAvailable()) {
			try {
				this.disposables.push(
					(vscode.window as any).onDidWriteTerminalData(this.onTerminalDataWritten, this)
				);
				console.log('Terminal data write event API enabled');
			} catch (error) {
				console.warn('Failed to register terminal data write event listener:', error instanceof Error ? error.message : String(error));
			}
		} else {
			console.log('Terminal data write event API not available. Using clipboard-based selection only.');
		}

		// 初始化现有终端
		vscode.window.terminals.forEach(terminal => {
			this.terminalBuffer.set(terminal.name, []);
		});
	}

	/**
	 * 检查 terminalDataWriteEvent API 是否可用
	 */
	private isTerminalDataWriteEventAvailable(): boolean {
		try {
			// 检查是否在开发模式下运行或者API是否可用
			if (typeof (vscode.window as any).onDidWriteTerminalData === 'function') {
				// 尝试访问API，如果不可用会抛出异常
				(vscode.window as any).onDidWriteTerminalData;
				return true;
			}
			return false;
		} catch (error) {
			console.log('Terminal data write event API not available, will use clipboard fallback:', error instanceof Error ? error.message : String(error));
			return false;
		}
	}

	/**
	 * 终端打开时的处理
	 */
	private onTerminalOpened(terminal: vscode.Terminal): void {
		this.terminalBuffer.set(terminal.name, []);
	}

	/**
	 * 终端关闭时的处理
	 */
	private onTerminalClosed(terminal: vscode.Terminal): void {
		this.terminalBuffer.delete(terminal.name);
	}

	/**
	 * 终端数据写入时的处理
	 */
	private onTerminalDataWritten(event: { terminal: vscode.Terminal; data: string }): void {
		const buffer = this.terminalBuffer.get(event.terminal.name);
		if (buffer) {
			// 将数据按行分割并添加到缓冲区
			const lines = event.data.split('\n');
			buffer.push(...lines);

			// 保持缓冲区大小合理（使用循环缓冲区模式）
			this.trimBuffer(buffer);
		}
	}

	/**
	 * 修剪缓冲区大小，使用更高效的循环缓冲区方式
	 */
	private trimBuffer(buffer: string[]): void {
		if (buffer.length > this.MAX_BUFFER_SIZE) {
			// 使用循环缓冲区模式，保留最新的内容
			buffer.splice(0, buffer.length - this.MAX_BUFFER_SIZE);
		}
	}

	/**
	 * 启动清理定时器
	 */
	private startCleanupTimer(): void {
		// 定期清理不活跃的终端缓冲区
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveBuffers();
		}, this.CLEANUP_INTERVAL_MS);
	}

	/**
	 * 清理不活跃的终端缓冲区
	 */
	private cleanupInactiveBuffers(): void {
		const activeTerminalNames = new Set(
			vscode.window.terminals.map(t => t.name)
		);

		// 清理已关闭或不活跃的终端缓冲区
		for (const [terminalName, buffer] of this.terminalBuffer) {
			if (!activeTerminalNames.has(terminalName)) {
				this.terminalBuffer.delete(terminalName);
				console.log(`Cleaned up buffer for inactive terminal: ${terminalName}`);
			} else if (buffer.length > this.MAX_BUFFER_SIZE / 2) {
				// 如果缓冲区过大，进行清理
				this.trimBuffer(buffer);
			}
		}
	}

	/**
	 * 获取当前活动终端的选中文本
	 */
	public async getSelectedText(): Promise<string | null> {
		try {
			// 检查是否有活动终端
			const activeTerminal = vscode.window.activeTerminal;
			if (!activeTerminal) {
				console.log('No active terminal found');
				return null;
			}

			// 方法1：使用 VS Code 命令复制终端选中的内容到剪贴板
			try {
				await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
				console.log('Executed terminal copy selection command');
				
				// 等待一小段时间确保复制完成
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// 然后从剪贴板获取内容
				const clipboardText = await vscode.env.clipboard.readText();
				if (clipboardText.trim()) {
					console.log('Found text from terminal selection via command, length:', clipboardText.length);
					return clipboardText;
				}
			} catch (error) {
				console.log('Terminal copy selection command failed:', error);
			}

			// 方法2：尝试从剪贴板获取选中的文本（用户手动复制）
			const clipboardText = await this.tryGetSelectionFromClipboard();
			if (clipboardText) {
				console.log('Found text from clipboard, length:', clipboardText.length);
				return clipboardText;
			}

			console.log('No text found in clipboard');
			return null;
		} catch (error) {
			console.warn('Failed to get terminal selection:', error instanceof Error ? error.message : String(error));
			return null;
		}
	}

	/**
	 * 尝试获取终端选择内容
	 * 注意：这是基于现有 API 的实现，可能需要根据实际的 VS Code API 调整
	 */
	private getTerminalSelection(terminal: vscode.Terminal): string | null {
		try {
			// 检查是否有 terminal.selection 属性（较新的 VS Code 版本）
			if ('selection' in terminal && typeof (terminal as any).selection === 'string') {
				return (terminal as any).selection;
			}

			// 如果无法直接获取选择，返回 null
			// 用户需要手动选择文本，然后通过命令触发
			return null;
		} catch (error) {
			console.warn('Failed to get terminal selection:', error instanceof Error ? error.message : String(error));
			return null;
		}
	}

	/**
	 * 尝试从剪贴板获取选择内容
	 */
	private async tryGetSelectionFromClipboard(): Promise<string | null> {
		try {
			// 获取剪贴板内容
			const clipboardText = await vscode.env.clipboard.readText();
			console.log('Clipboard text length:', clipboardText.length);
			console.log('Clipboard text preview:', clipboardText.substring(0, 100));

			// 检查是否看起来像 SQL 日志
			const looksLikeLog = this.looksLikeSQLLog(clipboardText);
			console.log('Looks like SQL log:', looksLikeLog);
			
			if (looksLikeLog) {
				return clipboardText;
			}

			// 如果看起来不像 SQL 日志，但剪贴板不为空，仍然返回内容
			// 让更高层的逻辑来决定是否处理这个内容
			if (clipboardText.trim()) {
				console.log('Clipboard content doesn\'t look like SQL log, but returning anyway for further processing');
				return clipboardText;
			}

			return null;
		} catch (error) {
			console.warn('Failed to read clipboard:', error instanceof Error ? error.message : String(error));
			return null;
		}
	}

	/**
	 * 检查文本是否看起来像 SQL 日志
	 */
	private looksLikeSQLLog(text: string): boolean {
		const lines = text.split('\n');

		// 检查是否包含 SQLAlchemy 相关的关键词
		const sqlKeywords = [
			'sqlalchemy.engine.Engine',
			'INSERT INTO',
			'SELECT',
			'UPDATE',
			'DELETE FROM',
			'CREATE TABLE',
			'ALTER TABLE',
			'DROP TABLE',
			'BEGIN',
			'COMMIT',
			'ROLLBACK',
			'SET',
			'VALUES',
			'WHERE',
			'JOIN',
			'GROUP BY',
			'ORDER BY',
			'HAVING',
			'LIMIT'
		];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) {continue;}

			// 检查是否包含 SQL 关键词
			if (sqlKeywords.some(keyword =>
				trimmed.toLowerCase().includes(keyword.toLowerCase())
			)) {
				return true;
			}

			// 检查是否包含占位符模式
			if (trimmed.includes('?') || trimmed.includes(':') || trimmed.includes('%s')) {
				return true;
			}

			// 检查是否包含参数格式
			if (trimmed.match(/\(.*?\)/) || trimmed.match(/\{.*?\}/) || trimmed.match(/\[.*?\]/)) {
				return true;
			}

			// 检查是否包含时间戳格式
			if (trimmed.includes('[generated in') || trimmed.includes('INFO ') || trimmed.includes('DEBUG ')) {
				return true;
			}
		}

		return false;
	}

	/**
	 * 获取终端的完整缓冲区内容
	 */
	public getTerminalBuffer(terminalName?: string): string[] {
		const targetTerminal = terminalName || this.getActiveTerminalName();
		if (!targetTerminal) {
			return [];
		}

		return this.terminalBuffer.get(targetTerminal) || [];
	}

	/**
	 * 获取活动终端名称
	 */
	private getActiveTerminalName(): string | undefined {
		const activeTerminal = vscode.window.activeTerminal;
		return activeTerminal?.name;
	}

	/**
	 * 清理资源
	 */
	public dispose(): void {
		// 清理定时器
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}

		// 清理 disposables
		this.disposables.forEach(disposable => {
			try {
				disposable.dispose();
			} catch (error) {
				console.warn('Error disposing terminal monitor:', error instanceof Error ? error.message : String(error));
			}
		});
		this.disposables = [];

		// 清理缓冲区
		this.terminalBuffer.clear();
	}
}