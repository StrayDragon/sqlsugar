import * as vscode from 'vscode';
import type { Provider } from '../../core/provider-registry';
import type { SQLDialect } from './parser-service';

export interface DialectProvider extends Provider {
  readonly dialect: SQLDialect;
  readonly displayName: string;
  readonly fileCommentPattern: RegExp;
}

const builtinDialects: DialectProvider[] = [
  { id: 'postgresql', name: 'PostgreSQL', dialect: 'postgresql', displayName: 'PostgreSQL', fileCommentPattern: /--\s*dialect:\s*postgres(?:ql)?/i, },
  { id: 'mysql', name: 'MySQL', dialect: 'mysql', displayName: 'MySQL', fileCommentPattern: /--\s*dialect:\s*mysql/i, },
  { id: 'sqlite', name: 'SQLite', dialect: 'sqlite', displayName: 'SQLite', fileCommentPattern: /--\s*dialect:\s*sqlite/i, },
];

export class DialectManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private currentDialect: SQLDialect;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    const config = vscode.workspace.getConfiguration('sqlsugar');
    this.currentDialect = config.get<SQLDialect>('defaultDialect', 'mysql');

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'sqlsugar.selectDialect';
    this.updateStatusBar();
    this.statusBarItem.show();

    const cmd = vscode.commands.registerCommand('sqlsugar.selectDialect', () => this.showDialectPicker());
    this.disposables.push(cmd);
  }

  getCurrentDialect(): SQLDialect {
    return this.currentDialect;
  }

  detectFromContent(content: string): SQLDialect | undefined {
    for (const d of builtinDialects) {
      if (d.fileCommentPattern.test(content)) return d.dialect;
    }
    return undefined;
  }

  private async showDialectPicker(): Promise<void> {
    const items = builtinDialects.map(d => ({ label: d.displayName, dialect: d.dialect }));
    const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select SQL Dialect' });
    if (selected) {
      this.currentDialect = selected.dialect;
      this.updateStatusBar();
    }
  }

  private updateStatusBar(): void {
    const display = builtinDialects.find(d => d.dialect === this.currentDialect)?.displayName ?? this.currentDialect;
    this.statusBarItem.text = `$(database) ${display}`;
    this.statusBarItem.tooltip = 'SQLSugar: Click to change SQL dialect';
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
