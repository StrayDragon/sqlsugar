import * as vscode from 'vscode';

/**
 * 终端内容监听器
 * 监听终端输出并缓存内容，支持获取选中文本
 */
export class TerminalMonitor {
	private static instance: TerminalMonitor;
	private terminalBuffer: Map<string, string[]> = new Map();
	private disposables: vscode.Disposable[] = [];

	private constructor() {
		this.setupTerminalListeners();
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

		// 监听终端数据写入（需要 terminalDataWriteEvent API proposal）
		this.disposables.push(
			(vscode.window as any).onDidWriteTerminalData(this.onTerminalDataWritten, this)
		);

		// 初始化现有终端
		vscode.window.terminals.forEach(terminal => {
			this.terminalBuffer.set(terminal.name, []);
		});
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

			// 保持缓冲区大小合理（保留最后 1000 行）
			if (buffer.length > 1000) {
				buffer.splice(0, buffer.length - 1000);
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
				return null;
			}

			// 主要方法：尝试从剪贴板获取选中的文本
			// 用户在终端中选择文本后，通常可以使用 Ctrl+C 复制
			const clipboardText = await this.tryGetSelectionFromClipboard();
			if (clipboardText) {
				return clipboardText;
			}

			return null;
		} catch (error) {
			console.warn('Failed to get terminal selection:', error);
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
			console.warn('Failed to get terminal selection:', error);
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

			// 检查是否看起来像 SQL 日志
			if (this.looksLikeSQLLog(clipboardText)) {
				return clipboardText;
			}

			return null;
		} catch (error) {
			console.warn('Failed to read clipboard:', error);
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
			'DROP TABLE'
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
		this.disposables.forEach(disposable => {
			try {
				disposable.dispose();
			} catch (error) {
				console.warn('Error disposing terminal monitor:', error);
			}
		});
		this.disposables = [];
		this.terminalBuffer.clear();
	}
}