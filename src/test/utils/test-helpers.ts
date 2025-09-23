import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ExtensionCore } from '../../core/extension-core';

/**
 * 测试辅助工具类
 * 提供常用的测试操作，减少代码重复
 */
export class TestHelpers {
  private static testWorkspace: string | undefined;
  private static tempFiles: string[] = [];

  /**
   * 设置测试工作区
   */
  static async setupTestWorkspace(): Promise<string> {
    if (this.testWorkspace) {
      return this.testWorkspace;
    }

    // 创建临时测试工作区
    this.testWorkspace = path.join(__dirname, '../../../test-workspace');

    if (!fs.existsSync(this.testWorkspace)) {
      fs.mkdirSync(this.testWorkspace, { recursive: true });
    }

    // 清理之前的临时文件
    await this.cleanupTempFiles();

    return this.testWorkspace;
  }

  /**
   * 创建测试文件
   */
  static async createTestFile(
    content: string,
    filename: string,
    extension: string = 'js'
  ): Promise<vscode.TextDocument> {
    const workspace = await this.setupTestWorkspace();
    const testFilePath = path.join(workspace, `${filename}.${extension}`);

    await fs.promises.writeFile(testFilePath, content);

    const document = await vscode.workspace.openTextDocument(testFilePath);
    return document;
  }

  /**
   * 获取活跃编辑器
   */
  static getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * 执行SQL编辑命令
   */
  static async executeSQLEditCommand(): Promise<void> {
    await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
    // 等待命令执行完成
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * 获取最新的临时文件路径
   */
  static async getLatestTempFilePath(workspace: string): Promise<string> {
    const tempDir = path.join(workspace, '.vscode/sqlsugar/temp');

    if (!fs.existsSync(tempDir)) {
      throw new Error('Temp directory does not exist');
    }

    const files = await fs.promises.readdir(tempDir);
    const tempFiles = files
      .filter(file => file.startsWith('temp_sql_') && file.endsWith('.sql'))
      .map(file => path.join(tempDir, file))
      .sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    if (tempFiles.length === 0) {
      throw new Error('No temp files found');
    }

    const latestTempFile = tempFiles[0];
    this.tempFiles.push(latestTempFile);
    return latestTempFile;
  }

  /**
   * 获取临时文件内容
   */
  static async getTempFileContent(workspace: string): Promise<string> {
    const tempFilePath = await this.getLatestTempFilePath(workspace);
    return await fs.promises.readFile(tempFilePath, 'utf8');
  }

  /**
   * 选择文本
   */
  static selectText(editor: vscode.TextEditor, startLine: number, startChar: number, endLine: number, endChar: number): void {
    const startPos = new vscode.Position(startLine, startChar);
    const endPos = new vscode.Position(endLine, endChar);
    const selection = new vscode.Selection(startPos, endPos);
    editor.selection = selection;
  }

  /**
   * 验证SQL内容
   */
  static validateSQL(content: string, expectedSubstrings: string[]): void {
    expectedSubstrings.forEach(substring => {
      if (!content.includes(substring)) {
        throw new Error(`Expected content to include: "${substring}"`);
      }
    });
  }

  /**
   * 验证SQL不包含某些内容
   */
  static validateSQLNotContains(content: string, forbiddenSubstrings: string[]): void {
    forbiddenSubstrings.forEach(substring => {
      if (content.includes(substring)) {
        throw new Error(`Content should not include: "${substring}"`);
      }
    });
  }

  /**
   * 清理临时文件
   */
  static async cleanupTempFiles(): Promise<void> {
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          await fs.promises.unlink(tempFile);
        }
      } catch (error) {
        console.warn(`Failed to delete temp file ${tempFile}:`, error);
      }
    }
    this.tempFiles = [];
  }

  /**
   * 清理测试工作区
   */
  static async cleanupWorkspace(): Promise<void> {
    await this.cleanupTempFiles();

    if (this.testWorkspace && fs.existsSync(this.testWorkspace)) {
      // 清理测试文件
      const files = await fs.promises.readdir(this.testWorkspace);
      for (const file of files) {
        const filePath = path.join(this.testWorkspace, file);
        if (fs.statSync(filePath).isFile()) {
          await fs.promises.unlink(filePath);
        }
      }
    }
  }

  /**
   * 获取扩展核心实例
   */
  static getExtensionCore(): ExtensionCore {
    return ExtensionCore.getInstance();
  }

  /**
   * 等待条件满足
   */
  static async waitForCondition(
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * 等待文件存在
   */
  static async waitForFileExists(filePath: string, timeout: number = 5000): Promise<void> {
    await this.waitForCondition(
      () => fs.existsSync(filePath),
      timeout
    );
  }

  /**
   * 创建VS Code存根（用于测试环境）
   */
  static setupVSCodeStubs(): void {
    // 在测试环境中设置必要的VS Code API存根
    if (typeof vscode !== 'undefined') {
      // 这些存根通常在测试框架中设置，这里作为占位符
      console.log('VS Code test environment detected');
    }
  }
}

/**
 * SQL测试模板
 */
export const SQL_TEST_TEMPLATES = {
  SIMPLE_SELECT: 'SELECT * FROM users WHERE id = :id',
  MULTI_LINE_SELECT: `SELECT id, name, email
FROM users
WHERE status = 'active'
ORDER BY created_at DESC`,
  JINJA2_SIMPLE: 'SELECT * FROM users WHERE name = \'{{ name }}\'',
  JINJA2_COMPLEX: `SELECT * FROM users
WHERE department_id = {{ department_id }}
  AND created_date >= '{{ start_date }}'
  {% if is_active %}AND status = 'active'{% endif %}
  {% if min_amount %}AND total_orders >= {{ min_amount }}{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit }}`,
  WITH_PLACEHOLDERS: 'SELECT * FROM orders WHERE user_id = :user_id AND status = :status',
  PYTHON_F_STRING: 'f"""SELECT * FROM users WHERE name = {user_name}"""',
  JAVASCRIPT_TEMPLATE: '`SELECT * FROM users WHERE id = ${userId}`'
};

/**
 * 通用的测试断言辅助函数
 */
export class TestAssertions {
  /**
   * 验证SQL语法正确性
   */
  static validateSQLSyntax(content: string): void {
    const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'GROUP BY', 'ORDER BY'];
    const upperContent = content.toUpperCase();

    // 检查是否包含基本SQL关键字
    const hasValidSQL = sqlKeywords.some(keyword => upperContent.includes(keyword));

    if (!hasValidSQL && content.trim().length > 0) {
      throw new Error(`Content does not appear to be valid SQL: ${content}`);
    }
  }

  /**
   * 验证占位符处理
   */
  static validatePlaceholderHandling(content: string, originalHadPlaceholders: boolean): void {
    if (originalHadPlaceholders) {
      // 检查临时占位符格式
      if (content.includes('__:')) {
        // 在临时文件中应该有临时占位符
        console.log('Temporary placeholders found in temp file');
      }
    }
  }

  /**
   * 验证引号处理
   */
  static validateQuoteHandling(content: string, expectedQuoteType: string): void {
    if (expectedQuoteType === 'triple') {
      if (!content.includes('"""') && !content.includes('\'\'\'')) {
        throw new Error('Expected triple quotes for multi-line content');
      }
    }
  }
}
