import * as vscode from 'vscode';
import { SQLParserService, SQLDialect } from './parser-service';

export class SQLDiagnosticsProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private parserService: SQLParserService;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private dialect: SQLDialect = 'mysql') {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('sqlsugar');
    this.parserService = new SQLParserService();

    const changeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
      if (this.shouldValidate(e.document)) {
        this.scheduleValidation(e.document);
      }
    });

    const closeDisposable = vscode.workspace.onDidCloseTextDocument(doc => {
      this.diagnosticCollection.delete(doc.uri);
    });

    this.disposables.push(changeDisposable, closeDisposable);
  }

  setDialect(dialect: SQLDialect): void {
    this.dialect = dialect;
  }

  private shouldValidate(document: vscode.TextDocument): boolean {
    if (document.languageId === 'sql') return true;
    if (document.uri.fsPath.includes('.vscode/sqlsugar/temp/')) return true;
    return false;
  }

  private scheduleValidation(document: vscode.TextDocument): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.validate(document), 300);
  }

  private validate(document: vscode.TextDocument): void {
    const text = document.getText();
    const result = this.parserService.parse(text, this.dialect);
    const diagnostics: vscode.Diagnostic[] = [];

    for (const error of result.errors) {
      const line = (error.line ?? 1) - 1;
      const col = (error.column ?? 1) - 1;
      const range = new vscode.Range(line, col, line, col + 10);
      diagnostics.push(new vscode.Diagnostic(range, error.message, vscode.DiagnosticSeverity.Error));
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.diagnosticCollection.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
