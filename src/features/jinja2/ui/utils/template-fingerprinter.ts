/**
 * Template fingerprinting service for unique template identification
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import * as crypto from 'node:crypto';
import type { TemplateFingerprint } from '../types/memory';
import type { memoryLogger } from '../../../core/logging/memory-logger';

/**
 * Template fingerprinting options
 */
export interface FingerprintingOptions {
  includeContentHash?: boolean;
  normalizeWhitespace?: boolean;
  includeVariables?: boolean;
  includeStructure?: boolean;
  sensitivity?: 'low' | 'medium' | 'high';
}

/**
 * Template analysis result
 */
export interface TemplateAnalysis {
  variableNames: string[];
  variableCount: number;
  controlStructures: ControlStructureInfo[];
  structureTokens: string[];
  templateLength: number;
  complexity: number;
}

/**
 * Control structure information
 */
export interface ControlStructureInfo {
  type: 'if' | 'for' | 'set' | 'macro' | 'block';
  line: number;
  column: number;
  content?: string;
}

/**
 * Template fingerprinting service
 */
export class TemplateFingerprinter {
  private readonly defaultOptions: Required<FingerprintingOptions> = {
    includeContentHash: true,
    normalizeWhitespace: false,
    includeVariables: true,
    includeStructure: true,
    sensitivity: 'medium'
  };

  /**
   * Generate fingerprint for a template
   */
  public generateFingerprint(template: string, options?: FingerprintingOptions): TemplateFingerprint {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      const analysis = this.analyzeTemplate(template, opts);
      const fingerprint = this.createFingerprint(template, analysis, opts);

      const duration = Date.now() - startTime;
      memoryLogger.fingerprint('debug', 'Template fingerprint generated successfully', fingerprint.structureHash, duration);

      return fingerprint;
    } catch (error) {
      const duration = Date.now() - startTime;
      memoryLogger.fingerprint('error', 'Failed to generate template fingerprint', undefined, duration);
      memoryLogger.logError('Template fingerprinting failed', error as Error, { operation: 'generateFingerprint' });
      throw error;
    }
  }

  /**
   * Find similar fingerprints from a list
   */
  public findSimilarFingerprints(
    fingerprint: TemplateFingerprint,
    storedFingerprints: TemplateFingerprint[],
    similarityThreshold: number = 0.8
  ): TemplateFingerprint[] {
    return storedFingerprints.filter(stored =>
      this.calculateSimilarity(fingerprint, stored) >= similarityThreshold
    );
  }

  /**
   * Calculate similarity between two fingerprints
   */
  public calculateSimilarity(fp1: TemplateFingerprint, fp2: TemplateFingerprint): number {
    let score = 0;
    let totalWeight = 0;

    // Structure hash (highest weight)
    if (fp1.structureHash === fp2.structureHash) {
      score += 0.5;
    }
    totalWeight += 0.5;

    // Variable names similarity
    const variableSimilarity = this.calculateArraySimilarity(fp1.variableNames, fp2.variableNames);
    score += variableSimilarity * 0.3;
    totalWeight += 0.3;

    // Variable count similarity
    const countSimilarity = 1 - Math.abs(fp1.variableCount - fp2.variableCount) / Math.max(fp1.variableCount, fp2.variableCount, 1);
    score += countSimilarity * 0.1;
    totalWeight += 0.1;

    // Template length similarity
    const lengthSimilarity = 1 - Math.abs(fp1.templateLength - fp2.templateLength) / Math.max(fp1.templateLength, fp2.templateLength, 1);
    score += lengthSimilarity * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Analyze template structure and extract components
   */
  private analyzeTemplate(template: string, options: Required<FingerprintingOptions>): TemplateAnalysis {
    let processedTemplate = template;

    // Normalize whitespace if requested
    if (options.normalizeWhitespace) {
      processedTemplate = this.normalizeWhitespace(template);
    }

    // Extract variable names
    const variableNames = this.extractVariableNames(processedTemplate);
    const uniqueVariableNames = [...new Set(variableNames)].sort();

    // Extract control structures
    const controlStructures = this.extractControlStructures(processedTemplate);

    // Generate structure tokens
    const structureTokens = this.generateStructureTokens(processedTemplate, controlStructures);

    // Calculate complexity
    const complexity = this.calculateComplexity(uniqueVariableNames.length, controlStructures.length, processedTemplate.length);

    return {
      variableNames: uniqueVariableNames,
      variableCount: uniqueVariableNames.length,
      controlStructures,
      structureTokens,
      templateLength: processedTemplate.length,
      complexity
    };
  }

  /**
   * Create fingerprint from analysis
   */
  private createFingerprint(template: string, analysis: TemplateAnalysis, options: Required<FingerprintingOptions>): TemplateFingerprint {
    const now = Date.now();

    // Generate structure hash
    const structureComponents = [
      ...analysis.variableNames,
      ...analysis.structureTokens,
      analysis.variableCount.toString()
    ];

    const structureHash = this.hashString(structureComponents.join('|'));

    // Generate content hash if requested
    let contentHash: string | undefined;
    if (options.includeContentHash) {
      contentHash = this.hashString(template);
    }

    return {
      structureHash,
      variableNames: analysis.variableNames,
      variableCount: analysis.variableCount,
      contentHash,
      templateLength: analysis.templateLength,
      created: now,
      lastSeen: now
    };
  }

  /**
   * Extract variable names from template
   */
  private extractVariableNames(template: string): string[] {
    const variables: string[] = [];

    // Match {{ variable }} patterns
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variableExpression = match[1].trim();

      // Extract variable names from expressions (e.g., user.name, items[0])
      const variableNames = this.extractVariableNamesFromExpression(variableExpression);
      variables.push(...variableNames);
    }

    return variables;
  }

  /**
   * Extract variable names from expressions
   */
  private extractVariableNamesFromExpression(expression: string): string[] {
    const variableNames: string[] = [];

    // Simple variable name pattern
    const simpleVarRegex = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
    let match;

    while ((match = simpleVarRegex.exec(expression)) !== null) {
      variableNames.push(match[1]);
    }

    return variableNames;
  }

  /**
   * Extract control structures from template
   */
  private extractControlStructures(template: string): ControlStructureInfo[] {
    const structures: ControlStructureInfo[] = [];
    const lines = template.split('\n');

    // Regex patterns for different control structures
    const patterns = [
      { type: 'if' as const, regex: /\{%\s*if\s+([^%]+)%\}/ },
      { type: 'elif' as const, regex: /\{%\s*elif\s+([^%]+)%\}/ },
      { type: 'for' as const, regex: /\{%\s*for\s+(\w+)\s+in\s+([^%]+)%\}/ },
      { type: 'set' as const, regex: /\{%\s*set\s+(\w+)\s*=\s*([^%]+)%\}/ },
      { type: 'macro' as const, regex: /\{%\s*macro\s+(\w+)/ },
      { type: 'block' as const, regex: /\{%\s*block\s+(\w+)/ }
    ];

    lines.forEach((line, lineIndex) => {
      patterns.forEach(pattern => {
        const match = line.match(pattern.regex);
        if (match) {
          structures.push({
            type: pattern.type,
            line: lineIndex + 1,
            column: match.index ? match.index + 1 : 0,
            content: match[0]
          });
        }
      });
    });

    return structures;
  }

  /**
   * Generate structure tokens for hashing
   */
  private generateStructureTokens(template: string, controlStructures: ControlStructureInfo[]): string[] {
    const tokens: string[] = [];

    // Add control structure tokens
    controlStructures.forEach(structure => {
      tokens.push(`${structure.type}:${structure.line}`);
    });

    // Add variable pattern tokens (simplified)
    const variablePattern = /\{\{\s*[^}]+\s*\}\}/g;
    let match;
    let varCount = 0;

    while ((match = variablePattern.exec(template)) !== null) {
      varCount++;
      if (varCount <= 10) { // Limit to prevent huge token lists
        tokens.push(`VAR:${varCount}`);
      }
    }

    if (varCount > 10) {
      tokens.push(`VAR_COUNT:${varCount}`);
    }

    return tokens;
  }

  /**
   * Calculate template complexity
   */
  private calculateComplexity(variableCount: number, structureCount: number, templateLength: number): number {
    const varComplexity = Math.min(variableCount / 10, 1);
    const structComplexity = Math.min(structureCount / 20, 1);
    const lengthComplexity = Math.min(templateLength / 5000, 1);

    return (varComplexity + structComplexity + lengthComplexity) / 3;
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(template: string): string {
    return template
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim();
  }

  /**
   * Calculate array similarity
   */
  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const intersection = arr1.filter(item => arr2.includes(item));
    const union = [...new Set([...arr1, ...arr2])];

    return intersection.length / union.length;
  }

  /**
   * Hash string using SHA-256
   */
  private hashString(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Singleton instance for template fingerprinting
 */
export const templateFingerprinter = new TemplateFingerprinter();