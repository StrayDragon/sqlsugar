import * as vscode from 'vscode';
import { Logger } from '../../core/logger';

import { TemplateProcessor, TemplateVariable } from './processor';
import { TemplatedSqlWebviewEditor } from './webview';
import { SQLAlchemyPlaceholderProcessor } from './sqlalchemy';
import { AnalyzerPipeline } from './analyzers/analyzer-pipeline';
import { TemplateExpressionAnalyzer } from './analyzers/jinja2-analyzer';
import { NamedParamAnalyzer } from './analyzers/named-param-analyzer';
import { NumericParamAnalyzer } from './analyzers/numeric-param-analyzer';
import { PyformatParamAnalyzer } from './analyzers/pyformat-param-analyzer';
import { AsyncpgParamAnalyzer } from './analyzers/asyncpg-param-analyzer';
import { LanguageHandler } from '../inline-sql/language-handler';
import { readSqlSelectionConfig, resolveSqlSelection } from '../inline-sql/sql-selection';
import { buildNamedParamVariables } from './workflow-actions';
import { detectEnabledAnalyzers } from './analyzers/detect';

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
export class TemplatedSqlHandler {
  private static instance: TemplatedSqlHandler;
  private processor: TemplateProcessor;
  private languageHandler: LanguageHandler;

  private constructor() {
    this.processor = TemplateProcessor.getInstance();
    this.languageHandler = new LanguageHandler();
  }

  public static getInstance(): TemplatedSqlHandler {
    if (!TemplatedSqlHandler.instance) {
      TemplatedSqlHandler.instance = new TemplatedSqlHandler();
    }
    return TemplatedSqlHandler.instance;
  }

  /**
   * 处理Jinja2模板 - 主要入口点
   */
  public static async handleCopyTemplatedSql(): Promise<boolean> {
    try {
      const handler = TemplatedSqlHandler.getInstance();
      return await handler.processTemplate();
    } catch (error) {
      Logger.error('Failed to handle Jinja2 template:', error);
      vscode.window.showErrorMessage(
        `Failed to process Jinja2 template: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 处理模板
   */
  private async processTemplate(): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found.', { modal: false });
      return false;
    }

    const resolved = resolveSqlSelection(
      editor.document,
      editor.selection,
      this.languageHandler,
      readSqlSelectionConfig()
    );

    if (!resolved) {
      vscode.window.showWarningMessage(
        'Place the cursor inside a template SQL string literal, or select the template to open.',
        { modal: false }
      );
      return false;
    }

    if (resolved.expanded || resolved.normalized) {
      editor.selection = resolved.selection;
    }

    const selectedText = this.languageHandler.stripQuotes(resolved.text);
    const processor = this.processor;


    const placeholderDetection =
      SQLAlchemyPlaceholderProcessor.detectPlaceholderTypes(selectedText);


    if (!placeholderDetection.hasJinja2 && placeholderDetection.hasSQLAlchemy) {
      const namedVars = buildNamedParamVariables(placeholderDetection.sqlalchemyVars);
      return await this.handleWebviewMode(
        selectedText,
        namedVars,
        placeholderDetection,
        editor,
        resolved
      );
    }


    const validation = processor.validateTemplate(selectedText);
    if (!validation.valid) {
      vscode.window.showErrorMessage(
        `Invalid Jinja2 template syntax:\n${validation.errors.join('\n')}`,
        { modal: false }
      );
      return false;
    }


    const mixedValidation = SQLAlchemyPlaceholderProcessor.validateMixedPlaceholders(selectedText);
    if (!mixedValidation.valid) {
      vscode.window.showErrorMessage(
        `Invalid mixed placeholders:\n${mixedValidation.errors.join('\n')}`,
        { modal: false }
      );
      return false;
    }


    if (mixedValidation.warnings.length > 0) {
      vscode.window.showWarningMessage(`Warnings:\n${mixedValidation.warnings.join('\n')}`, {
        modal: false,
      });
    }


    const variables = processor.extractVariables(selectedText);


    const analyzerPipeline = new AnalyzerPipeline();
    analyzerPipeline.register(new TemplateExpressionAnalyzer());
    analyzerPipeline.register(new NamedParamAnalyzer());
    analyzerPipeline.register(new NumericParamAnalyzer());
    analyzerPipeline.register(new PyformatParamAnalyzer());
    analyzerPipeline.register(new AsyncpgParamAnalyzer());

    const paramStyleCfg = vscode.workspace.getConfiguration('sqlsugar.paramStyle');
    const defaultMode = paramStyleCfg.get<'auto' | 'manual'>('defaultMode', 'auto');
    const configuredAnalyzers = paramStyleCfg.get<string[]>('enabledAnalyzers', ['jinja2', 'named']);
    const enabledAnalyzers =
      defaultMode === 'auto' ? detectEnabledAnalyzers(selectedText) : configuredAnalyzers;

    const analysisResult = analyzerPipeline.execute(selectedText, { enabledAnalyzers });
    const hasParamPlaceholders = analysisResult.parameters.some(p => p.type !== 'jinja2');

    if (variables.length === 0 && !placeholderDetection.hasSQLAlchemy && !hasParamPlaceholders) {
      vscode.window.showInformationMessage(
        'No Jinja2 variables or parameter placeholders found in selected template.',
        { modal: false }
      );
      return false;
    }


    const paramVariables: TemplateVariable[] = analysisResult.parameters
      .filter(p => p.type !== 'jinja2')
      .map(p => ({
        name: p.name,
        type: 'string' as const,
        description: `${p.type} parameter: ${p.originalText}`,
        paramPattern: p.originalText,
      }));


    const allVariables = [...variables, ...paramVariables];

    return await this.handleWebviewMode(
      selectedText,
      allVariables,
      placeholderDetection,
      editor,
      resolved
    );
  }

  /**
   * WebView 可视化模式 - 唯一可视化编辑入口
   */
  private async handleWebviewMode(
    template: string,
    variables: TemplateVariable[],
    _placeholderDetection: PlaceholderDetection,
    editor: vscode.TextEditor,
    resolved: { selection: vscode.Selection; text: string }
  ): Promise<boolean> {
    try {
      const preview = this.processor.getTemplatePreview(template);
      const title = `Templated SQL Editor: ${preview}`;
      const language = this.languageHandler.detectLanguage(editor.document);

      await TemplatedSqlWebviewEditor.showEditor(template, variables, title, {
        uri: editor.document.uri,
        selection: resolved.selection,
        originalQuoted: resolved.text,
        language,
      });

      return true;
    } catch (error) {
      Logger.warn(`Webview mode failed: ${error instanceof Error ? error.message : String(error)}`);
      vscode.window.showErrorMessage(
        `Failed to open Templated SQL Editor: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 获取处理器实例
   */
  public getProcessor(): TemplateProcessor {
    return this.processor;
  }

  /**
   * 验证模板
   */
  public validateTemplate(template: string): { valid: boolean; errors: string[] } {
    return this.processor.validateTemplate(template);
  }

  /**
   * 提取变量（包括 Jinja2 变量和参数占位符）
   */
  public extractVariables(template: string): TemplateVariable[] {

    const jinja2Variables = this.processor.extractVariables(template);


    const analyzerPipeline = new AnalyzerPipeline();
    analyzerPipeline.register(new TemplateExpressionAnalyzer());
    analyzerPipeline.register(new NamedParamAnalyzer());
    analyzerPipeline.register(new NumericParamAnalyzer());
    analyzerPipeline.register(new PyformatParamAnalyzer());
    analyzerPipeline.register(new AsyncpgParamAnalyzer());

    const analysisResult = analyzerPipeline.execute(template);


    const paramVariables: TemplateVariable[] = analysisResult.parameters
      .filter(p => p.type !== 'jinja2')
      .map(p => ({
        name: p.name,
        type: 'string' as const,
        description: `${p.type} parameter: ${p.originalText}`,
        paramPattern: p.originalText,
      }));


    const allVariables = [...jinja2Variables];
    const existingNames = new Set(allVariables.map(v => v.name));

    for (const param of paramVariables) {
      if (!existingNames.has(param.name)) {
        allVariables.push(param);
        existingNames.add(param.name);
      }
    }

    return allVariables;
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
}
