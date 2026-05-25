import * as vscode from 'vscode';
import { SQLParserService } from './parser-service';
import { SQLFormatterService } from './formatter-service';
import { SQLDiagnosticsProvider } from './diagnostics-provider';
import { DialectManager } from './dialect-manager';

export function registerSQLIntelligenceFeature(context: vscode.ExtensionContext): void {
  const dialectManager = new DialectManager();
  const diagnosticsProvider = new SQLDiagnosticsProvider(dialectManager.getCurrentDialect());
  const formatterService = new SQLFormatterService();
  const _parserService = new SQLParserService();

  const formatDisposable = vscode.languages.registerDocumentFormattingEditProvider(
    { language: 'sql' },
    {
      provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
        const config = vscode.workspace.getConfiguration('sqlsugar');
        const formatted = formatterService.format(document.getText(), {
          tabWidth: config.get('formatter.tabWidth', 2),
          keywordCase: config.get('formatter.keywordCase', 'upper'),
        });
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        return [vscode.TextEdit.replace(fullRange, formatted)];
      },
    }
  );

  context.subscriptions.push(dialectManager, diagnosticsProvider, formatDisposable);
}

export { SQLParserService } from './parser-service';
export { SQLFormatterService } from './formatter-service';
export { TemplatePreprocessor } from './template-preprocessor';
export { DialectManager } from './dialect-manager';
