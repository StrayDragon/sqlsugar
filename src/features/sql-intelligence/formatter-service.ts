import { format, type SqlLanguage } from 'sql-formatter';

export interface FormatOptions {
  language?: SqlLanguage;
  tabWidth?: number;
  useTabs?: boolean;
  keywordCase?: 'upper' | 'lower' | 'preserve';
  linesBetweenQueries?: number;
}

export class SQLFormatterService {
  format(sql: string, options: FormatOptions = {}): string {
    return format(sql, {
      language: options.language ?? 'sql',
      tabWidth: options.tabWidth ?? 2,
      useTabs: options.useTabs ?? false,
      keywordCase: options.keywordCase ?? 'upper',
      linesBetweenQueries: options.linesBetweenQueries ?? 2,
    });
  }

  getSupportedLanguages(): SqlLanguage[] {
    return ['sql', 'mysql', 'mariadb', 'postgresql', 'sqlite', 'transactsql', 'bigquery', 'plsql'];
  }
}
