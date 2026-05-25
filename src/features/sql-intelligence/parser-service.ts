import { Parser } from 'node-sql-parser';
import { TemplatePreprocessor, PreprocessResult } from './template-preprocessor';

export type SQLDialect = 'mysql' | 'postgresql' | 'sqlite' | 'transactsql' | 'bigquery';

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  offset?: number;
}

export interface ParseResult {
  valid: boolean;
  errors: ParseError[];
  ast?: unknown;
  preprocessResult: PreprocessResult;
}

export class SQLParserService {
  private parser: Parser;
  private preprocessor: TemplatePreprocessor;

  constructor() {
    this.parser = new Parser();
    this.preprocessor = new TemplatePreprocessor();
  }

  parse(sql: string, dialect: SQLDialect = 'mysql'): ParseResult {
    const preprocessResult = this.preprocessor.preprocess(sql);

    try {
      const ast = this.parser.astify(preprocessResult.processedSQL, { database: dialect });
      return { valid: true, errors: [], ast, preprocessResult };
    } catch (error: unknown) {
      const parseError = this.extractError(error);
      // Filter errors that fall within placeholder regions
      const filteredErrors = parseError.offset !== undefined
        && this.preprocessor.isInPlaceholderRegion(parseError.offset, preprocessResult.placeholders)
        ? []
        : [parseError];

      return { valid: filteredErrors.length === 0, errors: filteredErrors, preprocessResult };
    }
  }

  getSupportedDialects(): SQLDialect[] {
    return ['mysql', 'postgresql', 'sqlite', 'transactsql', 'bigquery'];
  }

  private extractError(error: unknown): ParseError {
    if (error instanceof Error) {
      const locMatch = error.message.match(/at line (\d+), column (\d+)/i)
        || error.message.match(/line (\d+) col (\d+)/i);
      return {
        message: error.message,
        line: locMatch ? parseInt(locMatch[1]) : undefined,
        column: locMatch ? parseInt(locMatch[2]) : undefined,
      };
    }
    return { message: String(error) };
  }
}
