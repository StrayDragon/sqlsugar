import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { Result } from '../types/result';
import { LanguageHandler, LanguageType, QuoteType } from './language-handler';
import { PreciseIndentSyncManager } from './precise-indent-sync';

/**
 * 临时文件信息接口
 */
export interface TempFileInfo {
  uri: vscode.Uri;
  originalEditor: vscode.TextEditor;
  originalSelection: vscode.Selection;
  originalQuotedSQL: string;
  lastSyncedContent: string;
  quoteType: QuoteType;
  language: LanguageType;
  disposables: vscode.Disposable[];
  isProcessing: boolean;
}

/**
 * 临时文件管理器
 * 负责创建、管理和清理临时SQL文件
 */
export class TempFileManager {
  private tempFiles: Map<string, TempFileInfo> = new Map();
  private languageHandler: LanguageHandler;
  private preciseIndentSync: PreciseIndentSyncManager;

  constructor(languageHandler: LanguageHandler, preciseIndentSync: PreciseIndentSyncManager) {
    this.languageHandler = languageHandler;
    this.preciseIndentSync = preciseIndentSync;
  }

  /**
   * 创建临时SQL文件
   */
  public async createTempSQLFile(
    originalEditor: vscode.TextEditor,
    originalSelection: vscode.Selection,
    originalQuotedSQL: string
  ): Promise<Result<vscode.Uri, Error>> {
    try {
      const language = this.languageHandler.detectLanguage(originalEditor.document);
      const quoteType = this.languageHandler.detectQuoteType(originalQuotedSQL);
      const sqlContent = this.languageHandler.stripQuotes(originalQuotedSQL);

      // 转换ORM占位符为sqls兼容格式
      const { convertedSQL, hasPlaceholders } = this.convertPlaceholdersToTemp(sqlContent);

      // 创建临时文件
      const tempDir = await this.ensureTempDirectory(originalEditor);
      const tempUri = await this.createTempFile(tempDir, convertedSQL, hasPlaceholders);

      // 保存临时文件信息
      const tempFileInfo: TempFileInfo = {
        uri: tempUri,
        originalEditor,
        originalSelection,
        originalQuotedSQL,
        lastSyncedContent: originalQuotedSQL,
        quoteType,
        language,
        disposables: [],
        isProcessing: false,
      };

      this.tempFiles.set(tempUri.fsPath, tempFileInfo);

      // 初始化精确缩进同步器
      const originalSQL = this.languageHandler.stripQuotes(originalQuotedSQL);
      if (originalSQL.includes('\n')) {
        this.preciseIndentSync.createTracker(tempUri.fsPath, originalSQL);
      }

      // 注册临时文件保存监听器
      this.registerSaveListener(tempFileInfo);

      return Result.ok(tempUri);
    } catch (error) {
      return Result.err(error as Error, `Failed to create temp file: ${error}`);
    }
  }

  /**
   * 确保临时目录存在
   */
  private async ensureTempDirectory(originalEditor: vscode.TextEditor): Promise<string> {
    let workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    console.log('Initial workspacePath:', workspacePath);

    // If no workspace folder is found, try to use the document's directory
    if (!workspacePath && originalEditor.document.uri.scheme === 'file') {
      workspacePath = path.dirname(originalEditor.document.uri.fsPath);
      console.log('Using document directory:', workspacePath);
    }

    // If still no path, use current working directory as fallback
    if (!workspacePath) {
      workspacePath = process.cwd();
      console.log('Using cwd as fallback:', workspacePath);
    }

    // Special handling for test environment
    if (process.env.VSCODE_TEST) {
      const docDir = path.dirname(originalEditor.document.uri.fsPath);
      if (docDir.includes('test-workspace')) {
        workspacePath = docDir;
        console.log('Test environment detected, using test workspace:', workspacePath);
      }
    }

    const tempDir = path.join(workspacePath, '.vscode/sqlsugar/temp');
    console.log('Temp directory will be:', tempDir);

    if (!fs.existsSync(tempDir)) {
      console.log('Temp directory does not exist, creating it...');
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('Temp directory created successfully:', tempDir);
    } else {
      console.log('Temp directory already exists:', tempDir);
    }

    return tempDir;
  }

  /**
   * 创建临时文件
   */
  private async createTempFile(
    tempDir: string,
    sqlContent: string,
    hasPlaceholders: boolean
  ): Promise<vscode.Uri> {
    const tempFileName = `temp_sql_${Date.now()}.sql`;
    const tempFilePath = path.join(tempDir, tempFileName);
    const tempUri = vscode.Uri.file(tempFilePath);

    const fileContent = this.generateTempFileContent(sqlContent, hasPlaceholders);
    await vscode.workspace.fs.writeFile(tempUri, Buffer.from(fileContent, 'utf8'));

    return tempUri;
  }

  /**
   * 生成临时文件内容
   */
  private generateTempFileContent(sql: string, _hasPlaceholders: boolean): string {
    return sql;
  }

  /**
   * 注册保存监听器
   */
  private registerSaveListener(tempFileInfo: TempFileInfo): void {
    const disposable = vscode.workspace.onDidSaveTextDocument(e => {
      if (e.uri.fsPath === tempFileInfo.uri.fsPath) {
        this.handleTempFileChange(tempFileInfo);
      }
    });

    tempFileInfo.disposables.push(disposable);
  }

  /**
   * 处理临时文件变化
   */
  private async handleTempFileChange(tempFileInfo: TempFileInfo): Promise<void> {
    if (tempFileInfo.isProcessing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    tempFileInfo.isProcessing = true;

    try {
      const result = await this.syncTempFileChanges(tempFileInfo);
      if (!result.ok) {
        console.error('Sync failed:', result.error);
        vscode.window.showErrorMessage(`Failed to sync changes: ${result.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      vscode.window.showErrorMessage(`Failed to sync changes: ${error}`);
    } finally {
      tempFileInfo.isProcessing = false;
    }
  }

  /**
   * 同步临时文件变化
   */
  private async syncTempFileChanges(tempFileInfo: TempFileInfo): Promise<Result<void, Error>> {
    try {
      // 检查原始编辑器是否仍然打开
      if (!tempFileInfo.originalEditor || tempFileInfo.originalEditor.document.isClosed) {
        console.log('Original editor is closed, skipping sync');
        return Result.ok(undefined);
      }

      const doc = await vscode.workspace.openTextDocument(tempFileInfo.uri);
      const modifiedSQL = doc.getText();

      // 转换回ORM占位符格式
      let finalSQL = this.convertPlaceholdersFromTemp(modifiedSQL);

      // 处理缩进同步
      finalSQL = await this.syncIndentation(tempFileInfo, finalSQL);

      // 包装内容
      const wrappedContent = await this.wrapContent(tempFileInfo, finalSQL);

      // 验证并更新选择范围
      const targetSelection = await this.validateAndUpdateSelection(tempFileInfo);
      if (!targetSelection) {
        console.log('Invalid selection, skipping sync');
        return Result.ok(undefined);
      }

      // 再次检查编辑器是否仍然有效
      if (tempFileInfo.originalEditor.document.isClosed) {
        console.log('Original editor closed before edit, skipping sync');
        return Result.ok(undefined);
      }

      // 替换选中的内容
      await tempFileInfo.originalEditor.edit(editBuilder => {
        editBuilder.replace(targetSelection, wrappedContent);
      });

      // 更新上次同步的内容
      tempFileInfo.lastSyncedContent = wrappedContent;

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(error as Error);
    }
  }

  /**
   * 同步缩进
   */
  private async syncIndentation(tempFileInfo: TempFileInfo, finalSQL: string): Promise<string> {
    // 对于Python多行SQL，使用精确缩进同步保留原始缩进
    if (tempFileInfo.language === 'python' && finalSQL.includes('\n')) {
      return this.preciseIndentSync.syncIndent(tempFileInfo.uri.fsPath, finalSQL);
    }
    return finalSQL;
  }

  /**
   * 包装内容
   */
  private async wrapContent(tempFileInfo: TempFileInfo, finalSQL: string): Promise<string> {
    // 对于markdown和generic语言，使用完全不同的同步策略
    if (tempFileInfo.language === 'markdown' || tempFileInfo.language === 'generic') {
      return this.languageHandler.reconstructMarkdownContent(
        tempFileInfo.originalQuotedSQL,
        finalSQL
      );
    }

    // 智能包装内容（根据内容升级引号类型）
    return this.languageHandler.wrapLikeIntelligent(
      tempFileInfo.originalQuotedSQL,
      finalSQL,
      tempFileInfo.language
    );
  }

  /**
   * 验证并更新选择范围
   */
  private async validateAndUpdateSelection(
    tempFileInfo: TempFileInfo
  ): Promise<vscode.Selection | undefined> {
    const currentDocument = tempFileInfo.originalEditor.document;
    const currentSelection = tempFileInfo.originalSelection;

    // 检查选择范围是否仍然有效
    let targetSelection = currentSelection;
    const currentSelectedText = currentDocument.getText(currentSelection);

    // 如果当前选择的内容与上次同步的内容不匹配，尝试查找上次同步内容的位置
    if (currentSelectedText !== tempFileInfo.lastSyncedContent) {
      const fullText = currentDocument.getText();
      const searchStr = tempFileInfo.lastSyncedContent;
      let originalIndex = this.findContentIndex(fullText, searchStr);

      if (originalIndex !== -1) {
        // 找到上次同步的内容，更新选择范围
        const startPos = currentDocument.positionAt(originalIndex);
        const endPos = currentDocument.positionAt(
          originalIndex + tempFileInfo.lastSyncedContent.length
        );
        targetSelection = new vscode.Selection(startPos, endPos);
      }
    }

    return targetSelection;
  }

  /**
   * 查找内容索引
   */
  private findContentIndex(fullText: string, searchStr: string): number {
    // Strategy 1: Look for exact match with word boundaries
    const escapedOriginal = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`\\b${escapedOriginal}\\b`, 'm');
    const exactMatch = fullText.match(exactRegex);

    let originalIndex = -1;
    if (exactMatch && exactMatch.index !== undefined) {
      originalIndex = exactMatch.index;
    } else {
      // Strategy 2: Use lastIndexOf to find the most recent occurrence
      originalIndex = fullText.lastIndexOf(searchStr);
    }

    // Validation: ensure the match is not a partial substring
    if (originalIndex !== -1) {
      const beforeChar = originalIndex > 0 ? fullText[originalIndex - 1] : '';
      const afterChar =
        originalIndex + searchStr.length < fullText.length
          ? fullText[originalIndex + searchStr.length]
          : '';

      // Check if it's a standalone match
      const isValidMatch =
        (beforeChar === '' || /\s/.test(beforeChar) || beforeChar === '=' || beforeChar === '(') &&
        (afterChar === '' || /\s/.test(afterChar) || afterChar === ';' || afterChar === ')');

      if (!isValidMatch) {
        originalIndex = -1;
      }
    }

    return originalIndex;
  }

  /**
   * 转换ORM占位符为临时格式
   */
  private convertPlaceholdersToTemp(sql: string): {
    convertedSQL: string;
    hasPlaceholders: boolean;
  } {
    const placeholderRegex = /:(?!\d+)\w+/g;
    let hasPlaceholders = false;
    let convertedSQL = sql;

    if (placeholderRegex.test(sql)) {
      hasPlaceholders = true;
      convertedSQL = sql.replace(placeholderRegex, (match, offset, str) => {
        // 检查前面是否是:: (PostgreSQL类型转换)
        if (offset > 0 && str[offset - 1] === ':') {
          return match; // 不转换PostgreSQL类型转换
        }
        // 检查是否是时间格式中的冒号
        if (offset > 0 && /\d/.test(str[offset - 1])) {
          return match; // 不转换时间格式中的冒号
        }
        return '__:' + match.substring(1); // 转换ORM占位符
      });
    }

    return { convertedSQL, hasPlaceholders };
  }

  /**
   * 转换临时占位符回ORM格式
   */
  private convertPlaceholdersFromTemp(sql: string): string {
    const tempPlaceholderRegex = /__:(\w+)/g;
    return sql.replace(tempPlaceholderRegex, ':$1');
  }

  /**
   * 清理临时文件
   */
  public cleanupTempFile(uri: vscode.Uri): void {
    const tempInfo = this.tempFiles.get(uri.fsPath);
    if (tempInfo) {
      // 清理所有disposables
      tempInfo.disposables.forEach(d => d.dispose());
      this.tempFiles.delete(uri.fsPath);

      // 清理精确缩进同步器
      this.preciseIndentSync.cleanupTracker(uri.fsPath);

      // 删除临时文件
      this.deleteTempFile(uri);
    }
  }

  /**
   * 删除临时文件
   */
  private deleteTempFile(uri: vscode.Uri): void {
    const tempFileCleanup = vscode.workspace
      .getConfiguration('sqlsugar')
      .get<boolean>('tempFileCleanup', true);
    const cleanupOnClose = vscode.workspace
      .getConfiguration('sqlsugar')
      .get<boolean>('cleanupOnClose', true);

    // 在测试环境中禁用自动删除
    if (tempFileCleanup && cleanupOnClose && !process.env.VSCODE_TEST) {
      vscode.workspace.fs.delete(uri).then(undefined, err => {
        console.error('Failed to delete temp file:', err);
      });
    } else if (process.env.VSCODE_TEST) {
      console.log(
        'Test environment detected, skipping automatic cleanup of temp file:',
        uri.fsPath
      );
    }
  }

  /**
   * 获取活跃临时文件数量
   */
  public getActiveTempFilesCount(): number {
    return this.tempFiles.size;
  }

  /**
   * 清理所有临时文件
   */
  public cleanupAll(): void {
    this.tempFiles.forEach((tempInfo, path) => {
      tempInfo.disposables.forEach(d => d.dispose());
      try {
        vscode.workspace.fs.delete(vscode.Uri.file(path));
      } catch (error) {
        console.error('Failed to delete temp file:', error);
      }
      // 清理精确缩进同步器
      this.preciseIndentSync.cleanupTracker(path);
    });

    this.tempFiles.clear();
  }

  /**
   * 销毁管理器
   */
  public dispose(): void {
    this.cleanupAll();
  }
}
