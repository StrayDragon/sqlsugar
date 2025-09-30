import * as vscode from 'vscode';

type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

function getConfiguredLogLevel(): LogLevel {
  try {
    const config = vscode.workspace.getConfiguration('sqlsugar');
    return (config.get<string>('logLevel', 'error') as LogLevel) || 'error';
  } catch {
    return 'error';
  }
}

function shouldLog(level: LogLevel, current: LogLevel): boolean {
  const weight: Record<LogLevel, number> = {
    none: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  };
  return weight[level] <= weight[current] && current !== 'none';
}

export class Logger {
  private static level: LogLevel = getConfiguredLogLevel();

  public static refreshLevel(): void {
    Logger.level = getConfiguredLogLevel();
  }

  public static error(...args: unknown[]): void {
    if (shouldLog('error', Logger.level)) console.error('[SQLSugar]', ...args);
  }

  public static warn(...args: unknown[]): void {
    if (shouldLog('warn', Logger.level)) console.warn('[SQLSugar]', ...args);
  }

  public static info(...args: unknown[]): void {
    if (shouldLog('info', Logger.level)) console.info('[SQLSugar]', ...args);
  }

  public static debug(...args: unknown[]): void {
    if (shouldLog('debug', Logger.level)) console.debug('[SQLSugar]', ...args);
  }
}


