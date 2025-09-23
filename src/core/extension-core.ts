import * as vscode from 'vscode';

import { Result } from '../types/result';
import { CommandManager } from './command-manager';
import { DIContainer, getContainer } from './di-container';
import { EventHandler } from './event-handler';
import { LanguageHandler } from './language-handler';
import { MetricsCollector, DevMetrics } from './metrics-collector';
import { PreciseIndentSyncManager } from './precise-indent-sync';
import { SQLsClientManager } from './sqls-client-manager';
import { TempFileManager } from './temp-file-manager';

/**
 * SQLSugar核心扩展管理器
 * 协调整个扩展的功能和生命周期
 */
export class ExtensionCore {
  private static instance: ExtensionCore | undefined;
  private context: vscode.ExtensionContext;
  private container: DIContainer;
  private languageHandler!: LanguageHandler;
  private sqlsClientManager!: SQLsClientManager;
  private commandManager!: CommandManager;
  private preciseIndentSync!: PreciseIndentSyncManager;
  private tempFileManager!: TempFileManager;
  private eventHandler!: EventHandler;
  private metricsCollector!: MetricsCollector;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.container = getContainer();

    // Initialize services using dependency injection
    this.initializeServices();
    this.registerServices();
    this.initialize();
  }

  /**
   * 初始化所有服务
   */
  private initializeServices(): void {
    this.languageHandler = new LanguageHandler();
    this.preciseIndentSync = new PreciseIndentSyncManager();
    this.sqlsClientManager = new SQLsClientManager(this.context);
    this.commandManager = new CommandManager(this.context);
    this.tempFileManager = new TempFileManager(this.languageHandler, this.preciseIndentSync);
    this.eventHandler = new EventHandler(this.tempFileManager);
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * 注册服务到DI容器
   */
  private registerServices(): void {
    this.container.registerSingleton('languageHandler', () => this.languageHandler);
    this.container.registerSingleton('sqlsClientManager', () => this.sqlsClientManager);
    this.container.registerSingleton('commandManager', () => this.commandManager);
    this.container.registerSingleton('preciseIndentSync', () => this.preciseIndentSync);
    this.container.registerSingleton('tempFileManager', () => this.tempFileManager);
    this.container.registerSingleton('eventHandler', () => this.eventHandler);
    this.container.registerSingleton('metricsCollector', () => this.metricsCollector);
    this.container.registerSingleton('extensionCore', () => this);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context?: vscode.ExtensionContext): ExtensionCore {
    if (!ExtensionCore.instance) {
      if (!context) {
        throw new Error('ExtensionCore instance not initialized and no context provided');
      }
      ExtensionCore.instance = new ExtensionCore(context);
    }
    return ExtensionCore.instance;
  }

  /**
   * 重置单例实例（用于测试环境）
   */
  public static resetInstance(): void {
    if (ExtensionCore.instance) {
      ExtensionCore.instance.dispose();
      ExtensionCore.instance = undefined;
      // Also reset the DI container
      getContainer().clear();
    }
  }

  /**
   * 初始化扩展
   */
  private initialize(): void {
    // 注册所有命令
    this.commandManager.registerCommands();

    // 在测试环境中跳过SQLs客户端启动
    if (process.env.VSCODE_TEST !== 'true') {
      // 启动SQLs客户端
      this.sqlsClientManager.startClient().catch(error => {
        console.error('Failed to start SQLs client:', error);
      });

      // 初始化数据库连接
      this.sqlsClientManager.initializeConnection().catch(error => {
        console.error('Failed to initialize connection:', error);
      });
    } else {
      console.log('Test environment detected, skipping SQLs client startup');
    }

    // 注册事件监听器
    this.eventHandler.registerEventListeners();

    // 注册开发者命令
    this.eventHandler.registerDeveloperCommands();
  }

  /**
   * 创建临时SQL文件
   */
  public async createTempSQLFile(
    originalEditor: vscode.TextEditor,
    originalSelection: vscode.Selection,
    originalQuotedSQL: string
  ): Promise<Result<vscode.Uri, Error>> {
    const startTime = Date.now();
    const result = await this.tempFileManager.createTempSQLFile(
      originalEditor,
      originalSelection,
      originalQuotedSQL
    );

    const operationTime = Date.now() - startTime;
    this.metricsCollector.recordPerformance(operationTime, !result.ok);

    return result;
  }

  // 所有临时文件管理逻辑已迁移到 TempFileManager 类

  /**
   * 获取开发指标
   */
  public getMetrics(): DevMetrics {
    const baseMetrics = this.metricsCollector.getMetrics();
    // Update with current values
    baseMetrics.activeDisposables = this.eventHandler.getDisposablesCount();
    baseMetrics.activeTempFiles = this.tempFileManager.getActiveTempFilesCount();
    return baseMetrics;
  }

  /**
   * 记录命令调用
   */
  public recordCommandInvocation(command: string): void {
    this.metricsCollector.recordCommandInvocation(command);
  }

  /**
   * 销毁扩展资源
   */
  public dispose(): void {
    // 清理临时文件
    this.tempFileManager.dispose();

    // 清理事件监听器
    this.eventHandler.dispose();

    // 清理SQLs客户端
    this.sqlsClientManager.dispose();

    // 清理精确缩进同步器
    if (typeof this.preciseIndentSync.dispose === 'function') {
      this.preciseIndentSync.dispose();
    }

    // 清理DI容器
    this.container.dispose();

    console.log('ExtensionCore disposed successfully');
  }

  // 公共访问方法
  public getLanguageHandler(): LanguageHandler {
    return this.languageHandler;
  }

  public getSQLsClientManager(): SQLsClientManager {
    return this.sqlsClientManager;
  }

  public getCommandManager(): CommandManager {
    return this.commandManager;
  }

  public getTempFileManager(): TempFileManager {
    return this.tempFileManager;
  }

  public getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }
}
