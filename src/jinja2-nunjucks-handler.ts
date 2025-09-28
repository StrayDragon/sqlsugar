import * as vscode from 'vscode';

import { Jinja2NunjucksProcessor, Jinja2Variable } from './jinja2-nunjucks-processor';
import { Jinja2VariableInput } from './jinja2-variable-input';
import { Jinja2WebviewEditor } from './jinja2-webview';
import { SQLAlchemyPlaceholderProcessor } from './sqlalchemy-placeholder-processor';

/**
 * 占位符检测结果
 */
interface PlaceholderDetection {
  hasJinja2: boolean;
  hasSQLAlchemy: boolean;
  jinja2Vars: string[];
  sqlalchemyVars: string[];
}

/**
 * Jinja2模板处理器接口
 * 统一的Jinja2处理入口点
 */
export class Jinja2NunjucksHandler {
  private static instance: Jinja2NunjucksHandler;
  private processor: Jinja2NunjucksProcessor;

  private constructor() {
    this.processor = Jinja2NunjucksProcessor.getInstance();
  }

  public static getInstance(): Jinja2NunjucksHandler {
    if (!Jinja2NunjucksHandler.instance) {
      Jinja2NunjucksHandler.instance = new Jinja2NunjucksHandler();
    }
    return Jinja2NunjucksHandler.instance;
  }

  /**
   * 处理Jinja2模板 - 主要入口点
   */
  public static async handleCopyJinja2Template(
    mode: 'quick' | 'wizard' | 'webview' | 'defaults' = 'quick'
  ): Promise<boolean> {
    try {
      const handler = Jinja2NunjucksHandler.getInstance();
      return await handler.processTemplate(mode);
    } catch (error) {
      console.error('Failed to handle Jinja2 template:', error);
      vscode.window.showErrorMessage(
        `Failed to process Jinja2 template: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 处理模板
   */
  private async processTemplate(mode: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.selection || editor.selection.isEmpty) {
      vscode.window.showWarningMessage('Please select a Jinja2 template SQL to copy.', {
        modal: false,
      });
      return false;
    }

    const selectedText = editor.document.getText(editor.selection);
    const processor = this.processor;

    // 检测占位符类型
    const placeholderDetection =
      SQLAlchemyPlaceholderProcessor.detectPlaceholderTypes(selectedText);

    // 如果只有SQLAlchemy占位符，没有Jinja2语法
    if (!placeholderDetection.hasJinja2 && placeholderDetection.hasSQLAlchemy) {
      return await this.handleSQLAlchemyOnly(selectedText, placeholderDetection.sqlalchemyVars);
    }

    // 验证模板语法
    const validation = processor.validateTemplate(selectedText);
    if (!validation.valid) {
      vscode.window.showErrorMessage(
        `Invalid Jinja2 template syntax:\n${validation.errors.join('\n')}`,
        { modal: false }
      );
      return false;
    }

    // 验证混合占位符
    const mixedValidation = SQLAlchemyPlaceholderProcessor.validateMixedPlaceholders(selectedText);
    if (!mixedValidation.valid) {
      vscode.window.showErrorMessage(
        `Invalid mixed placeholders:\n${mixedValidation.errors.join('\n')}`,
        { modal: false }
      );
      return false;
    }

    // 显示警告
    if (mixedValidation.warnings.length > 0) {
      vscode.window.showWarningMessage(`Warnings:\n${mixedValidation.warnings.join('\n')}`, {
        modal: false,
      });
    }

    // 提取变量
    const variables = processor.extractVariables(selectedText);
    if (variables.length === 0 && !placeholderDetection.hasSQLAlchemy) {
      vscode.window.showInformationMessage(
        'No Jinja2 variables or SQLAlchemy placeholders found in selected template.',
        { modal: false }
      );
      return false;
    }

    // 根据模式处理
    switch (mode) {
      case 'quick':
        return await this.handleQuickMode(selectedText, variables, placeholderDetection);
      case 'wizard':
        return await this.handleWizardMode(selectedText, variables, placeholderDetection);
      case 'webview':
        return await this.handleWebviewMode(selectedText, variables, placeholderDetection);
      case 'defaults':
        return await this.handleDefaultsMode(selectedText, variables, placeholderDetection);
      default:
        return await this.handleQuickMode(selectedText, variables, placeholderDetection);
    }
  }

  /**
   * 处理纯SQLAlchemy占位符
   */
  private async handleSQLAlchemyOnly(template: string, sqlalchemyVars: string[]): Promise<boolean> {
    try {
      const context: Record<string, any> = {};

      // 为每个SQLAlchemy变量收集输入
      for (const varName of sqlalchemyVars) {
        const value = await this.promptForSQLAlchemyVariable(varName);
        if (value === undefined) {
          return false; // 用户取消
        }
        context[varName] = value;
      }

      // 转换占位符
      const result = SQLAlchemyPlaceholderProcessor.convertMixedPlaceholders(template, context);
      const sql = result.convertedSQL;

      await this.copyToClipboard(sql, template, [], context);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `SQLAlchemy mode failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 快速模式 - 使用默认值生成
   */
  private async handleQuickMode(
    template: string,
    variables: Jinja2Variable[],
    placeholderDetection: PlaceholderDetection
  ): Promise<boolean> {
    try {
      // 使用快速配置获取默认值
      const context = await Jinja2VariableInput.quickConfigure(variables);

      let sql = this.processor.renderWithCustomVariables(template, context);

      // 处理SQLAlchemy占位符
      if (placeholderDetection.hasSQLAlchemy) {
        const result = SQLAlchemyPlaceholderProcessor.convertMixedPlaceholders(sql, context);
        sql = result.convertedSQL;
      }

      await this.copyToClipboard(sql, template, variables, context);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Quick mode failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 向导模式 - 交互式变量输入
   */
  private async handleWizardMode(
    template: string,
    variables: Jinja2Variable[],
    placeholderDetection: PlaceholderDetection
  ): Promise<boolean> {
    try {
      // 使用智能配置界面
      const context = await Jinja2VariableInput.smartConfigure(variables);
      if (!context) {
        return false; // 用户取消
      }

      // 渲染模板
      let sql = this.processor.renderWithCustomVariables(template, context);

      // 处理SQLAlchemy占位符
      if (placeholderDetection.hasSQLAlchemy) {
        const result = SQLAlchemyPlaceholderProcessor.convertMixedPlaceholders(sql, context);
        sql = result.convertedSQL;
      }

      await this.copyToClipboard(sql, template, variables, context);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Wizard mode failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * WebView模式 - 可视化编辑器
   */
  private async handleWebviewMode(
    template: string,
    variables: Jinja2Variable[],
    placeholderDetection: PlaceholderDetection
  ): Promise<boolean> {
    try {
      const preview = this.processor.getTemplatePreview(template);
      const title = `Jinja2 Template: ${preview}`;

      // 显示WebView编辑器
      const userValues = await Jinja2WebviewEditor.showEditor(template, variables as any, title);

      // 渲染模板
      let sql = this.processor.renderWithCustomVariables(template, userValues);

      // 处理SQLAlchemy占位符
      if (placeholderDetection.hasSQLAlchemy) {
        const result = SQLAlchemyPlaceholderProcessor.convertMixedPlaceholders(sql, userValues);
        sql = result.convertedSQL;
      }

      await this.copyToClipboard(sql, template, variables, userValues);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Webview mode failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 默认值模式 - 显示所有默认值选项
   */
  private async handleDefaultsMode(
    template: string,
    variables: Jinja2Variable[],
    placeholderDetection: PlaceholderDetection
  ): Promise<boolean> {
    try {
      const context: Record<string, any> = {};

      // 显示默认值并允许用户选择
      for (const variable of variables) {
        const defaultValue = this.formatDefaultValue(variable.defaultValue);
        const result = await vscode.window.showQuickPick(
          [
            { label: `Use Default: ${defaultValue}`, value: variable.defaultValue },
            { label: 'Enter Custom Value...', value: 'custom' },
          ],
          {
            placeHolder: `Select value for "${variable.name}" (${variable.type})`,
            title: `Configure Variable: ${variable.name}`,
          }
        );

        if (!result) {
          return false; // 用户取消
        }

        if (result.value === 'custom') {
          const customValue = await this.promptForVariable(variable);
          if (customValue === undefined) {
            return false;
          }
          context[variable.name] = customValue;
        } else {
          context[variable.name] = result.value;
        }
      }

      // 渲染模板
      let sql = this.processor.renderWithCustomVariables(template, context);

      // 处理SQLAlchemy占位符
      if (placeholderDetection.hasSQLAlchemy) {
        const result = SQLAlchemyPlaceholderProcessor.convertMixedPlaceholders(sql, context);
        sql = result.convertedSQL;
      }

      await this.copyToClipboard(sql, template, variables, context);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Defaults mode failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 复制到剪贴板
   */
  private async copyToClipboard(
    sql: string,
    template: string,
    variables: Jinja2Variable[],
    userValues?: Record<string, any>
  ): Promise<void> {
    try {
      await this.copyToClipboardWithFallback(sql);

      // 显示成功消息
      const variableCount = variables.length;
      const usedDefaults = userValues ? Object.keys(userValues).length : 0;
      const message = `Generated SQL copied to clipboard!\n• Found ${variableCount} variable${variableCount > 1 ? 's' : ''}`;

      if (userValues && usedDefaults > 0) {
        const customValues = Object.keys(userValues).filter(
          key =>
            JSON.stringify(userValues[key]) !==
            JSON.stringify(variables.find(v => v.name === key)?.defaultValue)
        );
        if (customValues.length > 0) {
          vscode.window.showInformationMessage(
            `${message}\n• Used ${customValues.length} custom value${customValues.length > 1 ? 's' : ''}`,
            { modal: false }
          );
        }
      }

      vscode.window.showInformationMessage(message, { modal: false });
    } catch (error) {
      throw new Error(
        `Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取处理器实例
   */
  public getProcessor(): Jinja2NunjucksProcessor {
    return this.processor;
  }

  /**
   * 验证模板
   */
  public validateTemplate(template: string): { valid: boolean; errors: string[] } {
    return this.processor.validateTemplate(template);
  }

  /**
   * 提取变量
   */
  public extractVariables(template: string): Jinja2Variable[] {
    return this.processor.extractVariables(template);
  }

  /**
   * 获取支持的特性
   */
  public getSupportedFeatures(): string[] {
    return this.processor.getSupportedFeatures();
  }

  /**
   * 获取支持的过滤器
   */
  public getSupportedFilters(): string[] {
    return this.processor.getSupportedFilters();
  }

  /**
   * 提示输入变量值
   */
  private async promptForVariable(variable: Jinja2Variable): Promise<any> {
    const prompt = `Enter ${variable.type} value for "${variable.name}"`;

    switch (variable.type) {
      case 'string':
        return await vscode.window.showInputBox({
          title: `Enter string value for "${variable.name}"`,
          placeHolder: `Enter text (default: ${variable.defaultValue})`,
          prompt: `Enter a text value for ${variable.name}`,
        });

      case 'number':
        const numberResult = await vscode.window.showInputBox({
          title: `Enter number value for "${variable.name}"`,
          placeHolder: `Enter number (default: ${variable.defaultValue})`,
          prompt: `Enter a numeric value for ${variable.name}`,
          validateInput: value => {
            if (!value) {
              return 'Please enter a number';
            }
            if (isNaN(Number(value))) {
              return 'Please enter a valid number';
            }
            return null;
          },
        });
        return numberResult ? Number(numberResult) : undefined;

      case 'date':
        const dateResult = await vscode.window.showInputBox({
          title: `Enter date value for "${variable.name}"`,
          placeHolder: `Enter date in YYYY-MM-DD format (default: ${variable.defaultValue})`,
          prompt: `Enter a date in YYYY-MM-DD format for ${variable.name}`,
          validateInput: value => {
            if (!value) {
              return 'Please enter a date';
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              return 'Please enter date in YYYY-MM-DD format';
            }
            if (isNaN(Date.parse(value))) {
              return 'Please enter a valid date';
            }
            return null;
          },
        });
        return dateResult;

      default:
        return await vscode.window.showInputBox({
          title: `Enter value for "${variable.name}"`,
          placeHolder: `Enter value (default: ${variable.defaultValue})`,
          prompt: `Enter a value for ${variable.name}`,
        });
    }
  }

  /**
   * 提示输入SQLAlchemy变量值
   */
  private async promptForSQLAlchemyVariable(varName: string): Promise<any> {
    const result = await vscode.window.showQuickPick(
      [
        { label: 'String', value: 'string', description: 'Text value' },
        { label: 'Number', value: 'number', description: 'Numeric value' },
        { label: 'Boolean', value: 'boolean', description: 'True/False' },
        { label: 'Null', value: 'null', description: 'NULL value' },
        { label: 'Date', value: 'date', description: 'Date value (YYYY-MM-DD)' },
      ],
      {
        placeHolder: `Select type for "${varName}"`,
        title: `SQLAlchemy Variable: ${varName}`,
      }
    );

    if (!result) {
      return undefined;
    }

    switch (result.value) {
      case 'string':
        return await vscode.window.showInputBox({
          title: `Enter string value for "${varName}"`,
          placeHolder: 'Enter text value',
        });

      case 'number':
        const numberResult = await vscode.window.showInputBox({
          title: `Enter number value for "${varName}"`,
          placeHolder: 'Enter number',
          validateInput: value => {
            if (!value) {
              return 'Please enter a number';
            }
            if (isNaN(Number(value))) {
              return 'Please enter a valid number';
            }
            return null;
          },
        });
        return numberResult ? Number(numberResult) : undefined;

      case 'boolean':
        const boolResult = await vscode.window.showQuickPick(
          [
            { label: 'True', value: true },
            { label: 'False', value: false },
          ],
          {
            placeHolder: `Select boolean value for "${varName}"`,
            title: `Boolean: ${varName}`,
          }
        );
        return boolResult?.value;

      case 'null':
        return null;

      case 'date':
        const dateResult = await vscode.window.showInputBox({
          title: `Enter date value for "${varName}"`,
          placeHolder: 'Enter date in YYYY-MM-DD format',
          validateInput: value => {
            if (!value) {
              return 'Please enter a date';
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              return 'Please enter date in YYYY-MM-DD format';
            }
            if (isNaN(Date.parse(value))) {
              return 'Please enter a valid date';
            }
            return null;
          },
        });
        return dateResult;

      default:
        return undefined;
    }
  }

  /**
   * 格式化默认值显示
   */
  private formatDefaultValue(defaultValue: any): string {
    if (defaultValue === undefined || defaultValue === null) {
      return 'undefined';
    }
    return String(defaultValue);
  }

  /**
   * 复制文本到剪贴板，支持 wl-copy fallback
   */
  private async copyToClipboardWithFallback(text: string): Promise<void> {
    try {
      // 首先尝试使用 VS Code 的剪贴板 API
      await vscode.env.clipboard.writeText(text);
    } catch (error) {
      console.warn('VS Code clipboard failed, trying fallback:', error);

      // 检查是否启用了 wl-copy fallback
      const config = vscode.workspace.getConfiguration('sqlsugar');
      const enableWlCopyFallback = config.get<boolean>('enableWlCopyFallback', false);

      if (enableWlCopyFallback && process.platform === 'linux') {
        await this.copyWithWlCopy(text);
      } else {
        // 如果没有启用 fallback 或者不是 Linux 系统，显示错误
        throw new Error('剪贴板操作失败，请检查系统权限或启用 wl-copy fallback');
      }
    }
  }

  /**
   * 使用 wl-copy 命令复制文本到剪贴板（Linux Wayland）
   */
  private async copyWithWlCopy(text: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // 使用 wl-copy 复制文本
      await execAsync(`echo '${text.replace(/'/g, "'\\''")}' | wl-copy`);
      console.log('Text copied to clipboard using wl-copy');
    } catch (error) {
      console.error('wl-copy failed:', error);
      throw new Error('wl-copy 命令执行失败，请确保已安装 wl-clipboard');
    }
  }
}
