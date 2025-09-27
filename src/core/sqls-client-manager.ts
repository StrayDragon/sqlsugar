import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  Executable,
  ServerOptions,
  State as LanguageClientState,
} from 'vscode-languageclient/node';

/**
 * 数据库连接接口
 */
export interface DatabaseConnection {
  alias: string;
  driver: string;
  dataSourceName?: string;
  proto?: string;
  user?: string;
  passwd?: string;
  host?: string;
  port?: string;
  dbName?: string;
  params?: Record<string, string>;
  sshConfig?: any;
}

/**
 * 连接配置接口
 */
export interface ConnectionConfig {
  lowercaseKeywords?: boolean;
  connections: DatabaseConnection[];
}

/**
 * SQLs客户端管理器
 * 负责sqls语言服务器的启动、停止和连接管理
 */
export class SQLsClientManager {
  private client: LanguageClient | undefined;
  private currentConnection: DatabaseConnection | undefined;
  private statusBarItem: vscode.StatusBarItem | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'sqlsugar.switchConnection';
    this.updateConnectionStatus();
  }

  /**
   * 启动SQLs客户端
   */
  public async startClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      const configPath = this.getConfigPath();
      const serverOptions: ServerOptions = this.getServerOptions(configPath);
      const clientOptions: LanguageClientOptions = this.getClientOptions();

      this.client = new LanguageClient(
        'sqlsugar',
        'SQLSugar Language Server',
        serverOptions,
        clientOptions
      );

      await this.client.start();
      vscode.window.showInformationMessage('SQLs language server started');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ENOENT') && errorMessage.includes('sqls')) {
        vscode.window.showErrorMessage(
          'SQLs language server not found. Please install sqls:\n' +
            '• Go: go install github.com/lighttiger2505/sqls@latest\n' +
            '• Or configure the path in settings: sqlsugar.sqlsPath'
        );
      } else {
        vscode.window.showErrorMessage(`Failed to start SQLs client: ${errorMessage}`);
      }
    }
  }

  /**
   * 停止SQLs客户端
   */
  public async stopClient(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = undefined;
      vscode.window.showInformationMessage('SQLs language server stopped');
    }
  }

  /**
   * 重启客户端
   */
  public async restartClient(): Promise<void> {
    // 如果客户端不存在或已经停止，直接启动新的客户端
    if (!this.client) {
      await this.startClient();
      return;
    }

    try {
      // 检查客户端状态，如果正在启动则等待
      if (this.client.state === LanguageClientState.Starting) {
        console.log('Client is starting, waiting before restart...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 尝试停止客户端
      if (this.client.state !== LanguageClientState.Stopped) {
        await this.client.stop();
      }
    } catch (error) {
      // 忽略停止错误，这通常是因为客户端已经处于停止状态
      console.warn('Error stopping client during restart:', error);
    } finally {
      this.client = undefined;
    }

    // 等待确保资源完全清理
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      await this.startClient();
    } catch (startError) {
      console.error('Failed to start client after restart:', startError);
      vscode.window.showErrorMessage(
        'Failed to restart SQLs client. Please check your configuration.'
      );
    }
  }

  /**
   * 获取配置路径（按照官方优先级）
   * 1. -config 指定的配置文件
   * 2. workspace/configuration (暂未实现)
   * 3. $XDG_CONFIG_HOME/sqls/config.yml 或 $HOME/.config/sqls/config.yml
   */
  private getConfigPath(): string {
    // 1. 检查用户指定的配置文件路径
    const userConfigPath = vscode.workspace
      .getConfiguration('sqlsugar')
      .get<string>('sqlsConfigPath');
    if (userConfigPath) {
      return this.resolveConfigPath(userConfigPath);
    }

    // 2. 检查默认配置文件路径
    const defaultConfigPath = this.getDefaultConfigPath();
    if (defaultConfigPath && fs.existsSync(defaultConfigPath)) {
      return defaultConfigPath;
    }

    // 3. 如果都没有找到，使用空配置（让 sqls 使用内置默认配置）
    return '';
  }

  /**
   * 获取默认配置文件路径
   */
  private getDefaultConfigPath(): string | null {
    // 优先使用 XDG_CONFIG_HOME
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
      return path.join(xdgConfigHome, 'sqls', 'config.yml');
    }

    // 回退到 HOME/.config
    const home = process.env.HOME;
    if (home) {
      return path.join(home, '.config', 'sqls', 'config.yml');
    }

    return null;
  }

  /**
   * 解析配置路径中的变量
   */
  private resolveConfigPath(configPath: string): string {
    let resolved = configPath;

    // 替换 ${workspaceFolder} 变量
    if (resolved.includes('${workspaceFolder}')) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceFolder) {
        resolved = resolved.replace('${workspaceFolder}', workspaceFolder);
      } else {
        throw new Error('No workspace folder found');
      }
    }

    // 替换 ${env:VAR_NAME} 变量
    const envVarMatch = resolved.match(/\$\{env:([^}]+)\}/);
    if (envVarMatch) {
      const envValue = process.env[envVarMatch[1]];
      if (envValue) {
        resolved = resolved.replace(envVarMatch[0], envValue);
      } else {
        throw new Error(`Environment variable ${envVarMatch[1]} not found`);
      }
    }

    return resolved;
  }

  /**
   * 获取服务器选项
   */
  private getServerOptions(configPath: string): ServerOptions {
    const sqlsPath = vscode.workspace.getConfiguration('sqlsugar').get<string>('sqlsPath', 'sqls');

    const executable: Executable = {
      command: sqlsPath,
      args: configPath ? ['-config', configPath] : [],
      options: {
        env: {
          ...process.env,
          ...(configPath ? { SQLS_CONFIG: configPath } : {}),
        },
      },
    };

    return { run: executable, debug: executable };
  }

  /**
   * 获取客户端选项
   */
  private getClientOptions(): LanguageClientOptions {
    return {
      documentSelector: [
        { scheme: 'file', language: 'sql' },
        { scheme: 'file', pattern: '**/*.sql' },
      ],
      synchronize: {
        configurationSection: 'sqlsugar',
      },
      outputChannelName: 'SQLs Language Server',
    };
  }

  /**
   * 加载连接配置
   */
  public async loadConnections(): Promise<DatabaseConnection[]> {
    const configPath = this.getConfigPath();

    // 如果没有配置文件，返回空数组
    if (!configPath) {
      return [];
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config: ConnectionConfig = yaml.load(configContent) as ConnectionConfig;

      if (!config.connections || !Array.isArray(config.connections)) {
        throw new Error('Invalid connections configuration');
      }

      return config.connections;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load connections: ${error}`);
      return [];
    }
  }

  /**
   * 切换到指定连接
   */
  public async switchToConnection(connection: DatabaseConnection): Promise<void> {
    this.currentConnection = connection;
    this.updateConnectionStatus();
    await this.restartClient();

    vscode.window.showInformationMessage(`Switched to connection: ${connection.alias}`);
  }

  /**
   * 获取当前连接
   */
  public getCurrentConnection(): DatabaseConnection | undefined {
    return this.currentConnection;
  }

  /**
   * 更新连接状态显示
   */
  private updateConnectionStatus(): void {
    if (!this.statusBarItem) {
      return;
    }

    if (this.currentConnection) {
      this.statusBarItem.text = `$(database) ${this.currentConnection.alias}`;
      this.statusBarItem.tooltip = `Database: ${this.currentConnection.driver}\nHost: ${this.currentConnection.host || 'N/A'}`;
    } else {
      this.statusBarItem.text = '$(database) No Connection';
      this.statusBarItem.tooltip = 'Click to select database connection';
    }

    this.statusBarItem.show();
  }

  /**
   * 显示连接选择器
   */
  public async showConnectionPicker(): Promise<void> {
    try {
      const connections = await this.loadConnections();

      if (connections.length === 0) {
        vscode.window.showInformationMessage('No database connections configured');
        return;
      }

      const items = connections.map(conn => ({
        label: conn.alias,
        description: `${conn.driver} - ${conn.host || 'N/A'}`,
        detail: `Database: ${conn.dbName || 'N/A'}`,
        connection: conn,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a database connection',
      });

      if (selected) {
        await this.switchToConnection(selected.connection);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to show connection picker: ${error}`);
    }
  }

  /**
   * 初始化连接
   */
  public async initializeConnection(): Promise<void> {
    try {
      const connections = await this.loadConnections();

      if (connections.length === 0) {
        vscode.window.showInformationMessage('No database connections found');
        return;
      }

      // 使用第一个连接作为默认连接
      const defaultConnection = connections[0];
      await this.switchToConnection(defaultConnection);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize connection: ${error}`);
    }
  }

  /**
   * 获取配置值
   */
  public getConfig<T>(key: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration('sqlsugar').get<T>(key, defaultValue);
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    this.statusBarItem?.dispose();
    this.stopClient();
  }
}
