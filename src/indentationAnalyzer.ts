import { Logger } from './core/logger';

export interface IndentationPattern {
  type: 'uniform' | 'hierarchical' | 'mixed' | 'keyword-aligned' | 'continuation' | 'none';
  baseIndent: string;
  levels: string[];
  consistency: number;
  keywordAlignments: Map<string, number>;
  andOrPatterns: Map<string, number>;
  continuationIndent: number;
  emptyLines: number[];
  lineTypes: Map<number, string>;
  lineIndents: Map<number, string>;
}

export class IndentationPatternAnalyzer {
  private readonly SQL_KEYWORDS = new Set([
    'SELECT',
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'JOIN',
    'LEFT',
    'RIGHT',
    'INNER',
    'OUTER',
    'GROUP',
    'ORDER',
    'HAVING',
    'LIMIT',
    'UNION',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE',
    'DROP',
    'ALTER',
    'WITH',
  ]);

  analyze(text: string): IndentationPattern {
    const lines = text.split('\n');
    const lineIndents = this.extractLineIndents(lines);
    const lineTypes = this.classifyLineTypes(lines);
    const consistency = this.calculateConsistency(lineIndents, lineTypes);

    const pattern: IndentationPattern = {
      type: this.detectPatternType(lineIndents, lineTypes, consistency, lines),
      baseIndent: this.detectBaseIndent(lineIndents),
      levels: this.detectIndentLevels(lineIndents),
      consistency,
      keywordAlignments: this.analyzeKeywordAlignments(lines, lineIndents),
      andOrPatterns: this.analyzeAndOrPatterns(lines, lineIndents, lineTypes),
      continuationIndent: this.detectContinuationIndent(lineIndents, lineTypes),
      emptyLines: this.detectEmptyLines(lines),
      lineTypes,
      lineIndents: this.createLineIndentsMap(lineIndents),
    };

    return pattern;
  }

  getIndentationForNewLine(lineType: string, pattern: IndentationPattern): string {
    switch (pattern.type) {
      case 'uniform':
        return pattern.baseIndent;

      case 'hierarchical':
        return this.getHierarchicalIndent(lineType, pattern);

      case 'keyword-aligned':
        return this.getKeywordAlignedIndent(lineType, pattern);

      case 'continuation':
        return this.getContinuationIndent(lineType, pattern);

      case 'mixed':
      case 'none':
      default:
        return pattern.baseIndent;
    }
  }

  private extractLineIndents(lines: string[]): string[] {
    return lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1] : '';
    });
  }

  private classifyLineTypes(lines: string[]): Map<number, string> {
    const lineTypes = new Map<number, string>();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        lineTypes.set(index, 'empty');
        return;
      }

      const firstWord = trimmed.split(/\s+/)[0].toUpperCase();
      if (this.SQL_KEYWORDS.has(firstWord)) {
        lineTypes.set(index, 'keyword');
      } else if (trimmed.startsWith('--')) {
        lineTypes.set(index, 'comment');
      } else if (this.isContinuationLine(lines, index)) {
        lineTypes.set(index, 'continuation');
      } else if (trimmed.includes(',') && !this.isFieldDefinition(lines, index)) {
        lineTypes.set(index, 'continuation');
      } else {
        lineTypes.set(index, 'content');
      }
    });

    return lineTypes;
  }

  private isContinuationLine(lines: string[], index: number): boolean {
    if (index === 0) {
      return false;
    }

    const prevLine = lines[index - 1].trim();
    const currentLine = lines[index].trim();


    return (
      prevLine.endsWith(',') ||
      prevLine.endsWith('+') ||
      prevLine.endsWith('||') ||
      (prevLine.length > 0 &&
        !prevLine.endsWith(';') &&
        currentLine.length > 0 &&
        !this.SQL_KEYWORDS.has(currentLine.split(/\s+/)[0].toUpperCase()))
    );
  }

  private isFieldDefinition(lines: string[], index: number): boolean {
    const line = lines[index].trim();
    const prevLine = index > 0 ? lines[index - 1].trim() : '';


    return (
      line.includes(',') &&
      prevLine.toUpperCase().includes('SELECT') &&
      !line.includes('FROM') &&
      !line.includes('WHERE')
    );
  }

  private calculateConsistency(lineIndents: string[], lineTypes: Map<number, string>): number {
    const nonEmptyLines = lineIndents.filter((_, index) => lineTypes.get(index) !== 'empty');
    if (nonEmptyLines.length <= 1) {
      return 1.0;
    }


    const hasTabs = nonEmptyLines.some(indent => indent.includes('\t'));
    const hasSpaces = nonEmptyLines.some(indent => indent.includes(' '));
    if (hasTabs && hasSpaces) {
      return 0.1;
    }

    const indentLengths = nonEmptyLines.map(indent => indent.length);
    const uniqueLengths = new Set(indentLengths);

    if (uniqueLengths.size === 1) {
      return 1.0;
    }


    const mean = indentLengths.reduce((sum, len) => sum + len, 0) / indentLengths.length;
    const variance =
      indentLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / indentLengths.length;


    return Math.max(0, 1 - variance / 100);
  }

  private detectPatternType(
    lineIndents: string[],
    lineTypes: Map<number, string>,
    consistency: number,
    lines: string[]
  ): IndentationPattern['type'] {
    const nonEmptyIndents = lineIndents.filter((_, index) => lineTypes.get(index) !== 'empty');

    if (nonEmptyIndents.length === 0) {
      return 'none';
    }


    const hasNoIndentation = nonEmptyIndents.every(indent => indent.length === 0);
    if (hasNoIndentation) {
      return 'none';
    }


    const hasTabs = nonEmptyIndents.some(indent => indent.includes('\t'));
    const hasSpaces = nonEmptyIndents.some(indent => indent.includes(' ') && indent.length > 0);
    if (hasTabs && hasSpaces) {
      return 'mixed';
    }

    if (consistency < 0.3) {
      return 'mixed';
    }

    const uniqueIndents = new Set(nonEmptyIndents);


    if (uniqueIndents.size === 1) {
      return 'uniform';
    }


    const indentLengths = Array.from(uniqueIndents).map(indent => indent.length);
    const minIndent = Math.min(...indentLengths);
    const maxIndent = Math.max(...indentLengths);


    const hasOnlyFieldContinuations = Array.from(lineTypes.entries()).every(
      ([index, type]) => type !== 'continuation' || this.isFieldDefinition(lines, index)
    );

    if (uniqueIndents.size === 2 && maxIndent - minIndent <= 4 && hasOnlyFieldContinuations) {
      return 'uniform';
    }

    const keywordAlignment = this.hasStrongKeywordAlignment(lineTypes, lineIndents);
    if (keywordAlignment) {
      return 'keyword-aligned';
    }


    const hasHierarchicalPattern = this.hasHierarchicalPattern(lineTypes, lineIndents, lines);
    if (hasHierarchicalPattern && uniqueIndents.size >= 2) {
      return 'hierarchical';
    }

    const continuationPattern = this.hasContinuationPattern(lineTypes, lineIndents);
    if (continuationPattern && uniqueIndents.size >= 2) {
      return 'continuation';
    }

    return 'hierarchical';
  }

  private detectBaseIndent(lineIndents: string[]): string {
    const nonEmptyIndents = lineIndents.filter(indent => indent.length > 0);
    if (nonEmptyIndents.length === 0) {
      return '';
    }


    const minLength = Math.min(...nonEmptyIndents.map(indent => indent.length));
    const commonIndents = nonEmptyIndents.filter(indent => indent.length === minLength);

    return commonIndents.length > 0 ? commonIndents[0] : '';
  }

  private detectIndentLevels(lineIndents: string[]): string[] {
    const uniqueIndents = Array.from(new Set(lineIndents.filter(indent => indent.length > 0)));
    return uniqueIndents.sort((a, b) => a.length - b.length);
  }

  private analyzeKeywordAlignments(lines: string[], lineIndents: string[]): Map<string, number> {
    const alignments = new Map<string, number>();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const firstWord = trimmed.split(/\s+/)[0].toUpperCase();

      if (this.SQL_KEYWORDS.has(firstWord)) {
        const indent = lineIndents[index];
        alignments.set(firstWord, indent.length);
      }


      const andOrMatch = trimmed.match(/^(AND|OR)\s+/);
      if (andOrMatch) {
        const indent = lineIndents[index];
        alignments.set(andOrMatch[1], indent.length);
      }
    });

    return alignments;
  }

  private analyzeAndOrPatterns(
    lines: string[],
    lineIndents: string[],
    lineTypes: Map<number, string>
  ): Map<string, number> {
    const andOrPatterns = new Map<string, number>();

    lines.forEach((line, index) => {
      const lineType = lineTypes.get(index);
      if (lineType === 'content' || lineType === 'continuation') {
        const trimmed = line.trim();

        const andOrMatch = trimmed.match(/^(AND|OR)\s+/);
        if (andOrMatch) {
          const indent = lineIndents[index];
          andOrPatterns.set(andOrMatch[1], indent.length);
        }
      }
    });

    return andOrPatterns;
  }

  private detectContinuationIndent(lineIndents: string[], lineTypes: Map<number, string>): number {
    const continuationLines = Array.from(lineTypes.entries())
      .filter(([, type]) => type === 'continuation')
      .map(([index]) => lineIndents[index].length);

    if (continuationLines.length === 0) {
      return 0;
    }

    return Math.round(
      continuationLines.reduce((sum, len) => sum + len, 0) / continuationLines.length
    );
  }

  private detectEmptyLines(lines: string[]): number[] {
    return lines
      .map((line, index) => (line.trim() === '' ? index : -1))
      .filter(index => index !== -1);
  }

  private createLineIndentsMap(lineIndents: string[]): Map<number, string> {
    const lineIndentsMap = new Map<number, string>();
    lineIndents.forEach((indent, index) => {
      lineIndentsMap.set(index, indent);
    });
    return lineIndentsMap;
  }

  private hasStrongKeywordAlignment(
    lineTypes: Map<number, string>,
    lineIndents: string[]
  ): boolean {
    const keywordLines = Array.from(lineTypes.entries())
      .filter(([, type]) => type === 'keyword')
      .map(([index]) => lineIndents[index].length);

    if (keywordLines.length < 3) {
      return false;
    }

    const uniqueAlignments = new Set(keywordLines);
    return uniqueAlignments.size >= 3;
  }

  private hasContinuationPattern(lineTypes: Map<number, string>, lineIndents: string[]): boolean {
    const continuationLines = Array.from(lineTypes.entries())
      .filter(([, type]) => type === 'continuation')
      .map(([index]) => lineIndents[index].length);

    return continuationLines.length >= 2;
  }

  private hasHierarchicalPattern(
    lineTypes: Map<number, string>,
    lineIndents: string[],
    lines: string[]
  ): boolean {
    const keywordLines = Array.from(lineTypes.entries())
      .filter(([, type]) => type === 'keyword')
      .map(([index]) => ({ index, indent: lineIndents[index].length }));

    if (keywordLines.length < 3) {
      return false;
    }









    const selectLine = keywordLines.find(
      line =>
        lineTypes.get(line.index) === 'keyword' &&
        this.getLineText(lines, line.index).toUpperCase().includes('SELECT')
    );
    const whereLine = keywordLines.find(
      line =>
        lineTypes.get(line.index) === 'keyword' &&
        this.getLineText(lines, line.index).toUpperCase().includes('WHERE')
    );

    if (!selectLine || !whereLine) {
      return false;
    }


    const contentLines = Array.from(lineTypes.entries())
      .filter(([, type]) => type === 'content')
      .map(([index]) => lineIndents[index].length);

    const maxContentIndent = contentLines.length > 0 ? Math.max(...contentLines) : 0;
    const avgKeywordIndent =
      keywordLines.reduce((sum, line) => sum + line.indent, 0) / keywordLines.length;

    return maxContentIndent > avgKeywordIndent;
  }

  private getLineText(lines: string[], index: number): string {
    return lines[index] || '';
  }

  private getHierarchicalIndent(lineType: string, pattern: IndentationPattern): string {
    switch (lineType) {
      case 'WHERE':
        return pattern.baseIndent;
      case 'AND':
      case 'OR':


        const whereIndent = pattern.keywordAlignments.get('WHERE') || 0;
        const andIndent = pattern.keywordAlignments.get('AND');


        Logger.debug(
          `getHierarchicalIndent for AND: whereIndent=${whereIndent}, andIndent=${andIndent}, pattern.type=${pattern.type}`
        );

        if (andIndent !== undefined && andIndent > whereIndent) {
          Logger.debug(`Using AND indent from keyword alignments: ${andIndent} spaces`);
          return ' '.repeat(andIndent);
        }


        const andOrPatternIndent =
          pattern.andOrPatterns.get('AND') || pattern.andOrPatterns.get('OR');
        if (andOrPatternIndent !== undefined && andOrPatternIndent > whereIndent) {
          return ' '.repeat(andOrPatternIndent);
        }


        if (pattern.type === 'continuation') {


          const contentLines = Array.from(pattern.lineTypes.entries())
            .filter(([, type]) => type === 'content')
            .map(([index]) => pattern.lineIndents?.get(index))
            .find(indent => indent && indent.length > pattern.baseIndent.length);

          if (contentLines) {
            return contentLines;
          }
        }


        return ' '.repeat(whereIndent + 2);
      case 'JOIN':
      case 'LEFT':
      case 'RIGHT':
      case 'INNER':
      case 'OUTER':
        return pattern.baseIndent;
      case 'SELECT':
        return pattern.baseIndent;
      case 'FROM':
        return pattern.baseIndent;
      case 'field':
        return pattern.levels[1] || pattern.baseIndent + '    ';
      default:
        return pattern.baseIndent;
    }
  }

  private getKeywordAlignedIndent(lineType: string, pattern: IndentationPattern): string {
    const keywordAlignments = pattern.keywordAlignments;

    switch (lineType) {
      case 'WHERE':
        return ' '.repeat(keywordAlignments.get('WHERE') || pattern.baseIndent.length + 2);
      case 'AND':
      case 'OR':
        return ' '.repeat((keywordAlignments.get('WHERE') || pattern.baseIndent.length) + 2);
      case 'FROM':
        return ' '.repeat(keywordAlignments.get('FROM') || pattern.baseIndent.length);
      case 'JOIN':
        return ' '.repeat(keywordAlignments.get('FROM') || pattern.baseIndent.length);
      default:
        return pattern.baseIndent;
    }
  }

  private getContinuationIndent(lineType: string, pattern: IndentationPattern): string {
    if (lineType === 'continuation' || lineType === 'field') {
      return ' '.repeat(pattern.continuationIndent);
    }


    if (lineType === 'AND' || lineType === 'OR') {

      const whereIndent = pattern.keywordAlignments.get('WHERE') || 0;
      const andIndent = pattern.keywordAlignments.get('AND');

      if (andIndent !== undefined && andIndent > whereIndent) {
        return ' '.repeat(andIndent);
      }


      const andOrPatternIndent =
        pattern.andOrPatterns.get('AND') || pattern.andOrPatterns.get('OR');
      if (andOrPatternIndent !== undefined && andOrPatternIndent > whereIndent) {
        return ' '.repeat(andOrPatternIndent);
      }


      const contentLines = Array.from(pattern.lineTypes.entries())
        .filter(([, type]) => type === 'content')
        .map(([index]) => pattern.lineIndents?.get(index))
        .find(indent => indent && indent.length > pattern.baseIndent.length);

      if (contentLines) {
        return contentLines;
      }


      return ' '.repeat(whereIndent + 2);
    }

    return pattern.baseIndent;
  }
}
