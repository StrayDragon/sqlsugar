import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 剪贴板管理器
 * 处理复制操作，支持 VS Code 原生 API 和系统命令回退
 */
export class ClipboardManager {
	private static instance: ClipboardManager;

	private constructor() { }

	public static getInstance(): ClipboardManager {
		if (!ClipboardManager.instance) {
			ClipboardManager.instance = new ClipboardManager();
		}
		return ClipboardManager.instance;
	}

	/**
	 * 复制文本到剪贴板
	 */
	public async copyText(text: string): Promise<boolean> {
		try {
			// 首先尝试使用 VS Code 原生 API
			const success = await this.copyWithVSCodeAPI(text);
			if (success) {
				return true;
			}

			// 如果失败，尝试使用系统命令
			return await this.copyWithSystemCommand(text);
		} catch (error) {
			console.warn('Failed to copy text to clipboard:', error);
			return false;
		}
	}

	/**
	 * 使用 VS Code 原生 API 复制
	 */
	private async copyWithVSCodeAPI(text: string): Promise<boolean> {
		try {
			await vscode.env.clipboard.writeText(text);
			return true;
		} catch (error) {
			console.warn('VS Code clipboard API failed:', error);
			return false;
		}
	}

	/**
	 * 使用系统命令复制
	 */
	private async copyWithSystemCommand(text: string): Promise<boolean> {
		try {
			const platform = process.platform;

			switch (platform) {
				case 'linux':
					return await this.copyOnLinux(text);
				case 'darwin':
					return await this.copyOnMacOS(text);
				case 'win32':
					return await this.copyOnWindows(text);
				default:
					console.warn(`Unsupported platform: ${platform}`);
					return false;
			}
		} catch (error) {
			console.warn('System command copy failed:', error);
			return false;
		}
	}

	/**
	 * 在 Linux 上复制（支持 wl-copy 和 xclip）
	 */
	private async copyOnLinux(text: string): Promise<boolean> {
		try {
			// 首先尝试 wl-copy (Wayland)
			if (await this.isCommandAvailable('wl-copy')) {
				await execAsync(`echo ${this.escapeShellArgument(text)} | wl-copy`);
				return true;
			}

			// 然后尝试 xclip (X11)
			if (await this.isCommandAvailable('xclip')) {
				await execAsync(`echo ${this.escapeShellArgument(text)} | xclip -selection clipboard`);
				return true;
			}

			// 最后尝试 xsel
			if (await this.isCommandAvailable('xsel')) {
				await execAsync(`echo ${this.escapeShellArgument(text)} | xsel --clipboard --input`);
				return true;
			}

			console.warn('No clipboard command available on Linux');
			return false;
		} catch (error) {
			console.warn('Linux copy command failed:', error);
			return false;
		}
	}

	/**
	 * 在 macOS 上复制
	 */
	private async copyOnMacOS(text: string): Promise<boolean> {
		try {
			if (await this.isCommandAvailable('pbcopy')) {
				await execAsync(`echo ${this.escapeShellArgument(text)} | pbcopy`);
				return true;
			}

			console.warn('pbcopy command not available on macOS');
			return false;
		} catch (error) {
			console.warn('macOS copy command failed:', error);
			return false;
		}
	}

	/**
	 * 在 Windows 上复制
	 */
	private async copyOnWindows(text: string): Promise<boolean> {
		try {
			// Windows 上使用 clip 命令
			if (await this.isCommandAvailable('clip')) {
				// 注意：clip 命令需要特殊的换行符处理
				const textWithNewline = text + '\n';
				await execAsync(`echo ${this.escapeShellArgument(textWithNewline)} | clip`);
				return true;
			}

			console.warn('clip command not available on Windows');
			return false;
		} catch (error) {
			console.warn('Windows copy command failed:', error);
			return false;
		}
	}

	/**
	 * 检查命令是否可用
	 */
	private async isCommandAvailable(command: string): Promise<boolean> {
		try {
			await execAsync(`command -v ${command}`);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * 转义 shell 参数
	 */
	private escapeShellArgument(text: string): string {
		// 简单的转义，处理单引号和双引号
		return text.replace(/'/g, "'\\''").replace(/"/g, '\\"');
	}

	/**
	 * 获取可用的剪贴板命令信息
	 */
	public async getClipboardInfo(): Promise<{
		nativeAPI: boolean;
		availableCommands: string[];
		platform: string;
	}> {
		const platform = process.platform;
		const availableCommands: string[] = [];

		// 检查 VS Code 原生 API
		const nativeAPI = await this.testVSCodeClipboardAPI();

		// 检查系统命令
		switch (platform) {
			case 'linux':
				if (await this.isCommandAvailable('wl-copy')) {
					availableCommands.push('wl-copy');
				}
				if (await this.isCommandAvailable('xclip')) {
					availableCommands.push('xclip');
				}
				if (await this.isCommandAvailable('xsel')) {
					availableCommands.push('xsel');
				}
				break;
			case 'darwin':
				if (await this.isCommandAvailable('pbcopy')) {
					availableCommands.push('pbcopy');
				}
				break;
			case 'win32':
				if (await this.isCommandAvailable('clip')) {
					availableCommands.push('clip');
				}
				break;
		}

		return {
			nativeAPI,
			availableCommands,
			platform
		};
	}

	/**
	 * 测试 VS Code 剪贴板 API
	 */
	private async testVSCodeClipboardAPI(): Promise<boolean> {
		try {
			const testText = 'test';
			await vscode.env.clipboard.writeText(testText);
			const readText = await vscode.env.clipboard.readText();
			return readText === testText;
		} catch {
			return false;
		}
	}
}