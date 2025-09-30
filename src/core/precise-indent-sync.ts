import { Logger } from './logger';

/**
 * 精确缩进同步器 - 追求100%一致的缩进保持
 *
 * 核心原则：
 * 1. 不分析任何缩进模式
 * 2. 不推断任何缩进规则
 * 3. 完全基于行内容匹配
 * 4. 精确复制原始缩进
 */

export interface LineFingerprint {
  contentHash: string;
  originalIndent: string;
  lineIndex: number;
}

export interface PreciseIndentTracker {
  originalSql: string;
  fingerprints: LineFingerprint[];
  isEmpty: boolean;
}

export class PreciseIndentSyncManager {
  private trackers: Map<string, PreciseIndentTracker> = new Map();

  /**
   * 创建精确缩进跟踪器
   */
  createTracker(tempFilePath: string, originalSql: string): PreciseIndentTracker {
    const fingerprints = this.createFingerprints(originalSql);

    const tracker: PreciseIndentTracker = {
      originalSql,
      fingerprints,
      isEmpty: fingerprints.length === 0,
    };

    this.trackers.set(tempFilePath, tracker);
    Logger.debug('DEBUG: Created precise indent tracker with', fingerprints.length, 'fingerprints');
    return tracker;
  }

  /**
   * 创建行指纹
   */
  private createFingerprints(sql: string): LineFingerprint[] {
    const lines = sql.split('\n');
    const fingerprints: LineFingerprint[] = [];

    lines.forEach((line, index) => {

      const indentMatch = line.match(/^(\s*)(.+)$/);
      if (indentMatch) {
        const [, indent, content] = indentMatch;
        const contentHash = this.hashContent(content.trim());

        fingerprints.push({
          contentHash,
          originalIndent: indent,
          lineIndex: index,
        });
      } else {

        const contentHash = this.hashContent('');
        fingerprints.push({
          contentHash,
          originalIndent: line,
          lineIndex: index,
        });
      }
    });

    return fingerprints;
  }

  /**
   * 同步缩进 - 精确匹配并复制缩进
   */
  syncIndent(tempFilePath: string, formattedSql: string): string {
    const tracker = this.trackers.get(tempFilePath);
    if (!tracker || tracker.isEmpty) {
      Logger.debug('DEBUG: No tracker found or empty, returning formatted SQL as-is');
      return formattedSql;
    }

    const formattedLines = formattedSql.split('\n');
    const result: string[] = [];

    Logger.debug('DEBUG: Syncing indent for', formattedLines.length, 'lines');

    for (let i = 0; i < formattedLines.length; i++) {
      const formattedLine = formattedLines[i];
      const trimmed = formattedLine.trim();

      if (!trimmed) {

        result.push('');
        continue;
      }


      const fingerprint = this.findMatchingFingerprint(tracker, trimmed);

      if (fingerprint) {

        result.push(fingerprint.originalIndent + trimmed);
        Logger.debug(
          `DEBUG: Line ${i}: Matched fingerprint, using indent with`,
          fingerprint.originalIndent.length,
          'spaces'
        );
      } else {

        const inferredIndent = this.inferIndentFromContext(formattedLines, i, tracker);
        result.push(inferredIndent + trimmed);
        Logger.debug(
          `DEBUG: Line ${i}: No fingerprint match, inferred indent with`,
          inferredIndent.length,
          'spaces'
        );
      }
    }

    const finalResult = result.join('\n');
    Logger.debug('DEBUG: Final synced SQL:', JSON.stringify(finalResult, null, 2));
    return finalResult;
  }

  /**
   * 查找匹配的指纹
   */
  private findMatchingFingerprint(
    tracker: PreciseIndentTracker,
    content: string
  ): LineFingerprint | null {
    const contentHash = this.hashContent(content);


    let fingerprint = tracker.fingerprints.find(fp => fp.contentHash === contentHash);

    if (fingerprint) {
      return fingerprint;
    }


    fingerprint = tracker.fingerprints.find(fp => {
      const fpContent = this.normalizeContent(content);
      const originalContent = this.getOriginalContentFromFingerprint(tracker, fp);
      return fpContent === this.normalizeContent(originalContent);
    });

    return fingerprint || null;
  }

  /**
   * 从上下文推断缩进
   */
  private inferIndentFromContext(
    formattedLines: string[],
    currentIndex: number,
    tracker: PreciseIndentTracker
  ): string {

    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = formattedLines[i];
      const trimmed = line.trim();

      if (trimmed) {

        const fingerprint = this.findMatchingFingerprint(tracker, trimmed);
        if (fingerprint) {
          return fingerprint.originalIndent;
        }


        const indentMatch = line.match(/^(\s*)/);
        if (indentMatch) {
          return indentMatch[1];
        }

        break;
      }
    }


    if (currentIndex > 0) {
      const prevLine = formattedLines[currentIndex - 1];
      const prevIndent = prevLine.match(/^(\s*)/)?.[1] || '';
      return prevIndent;
    }

    return '';
  }

  /**
   * 获取指纹的原始内容
   */
  private getOriginalContentFromFingerprint(
    tracker: PreciseIndentTracker,
    fingerprint: LineFingerprint
  ): string {
    const originalLine = tracker.originalSql.split('\n')[fingerprint.lineIndex];
    return originalLine?.trim() || '';
  }

  /**
   * 标准化内容用于模糊匹配
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[(),`"'=<>]/g, '') // 移除常见标点
      .trim();
  }

  /**
   * 生成内容哈希
   */
  private hashContent(content: string): string {

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 清理跟踪器
   */
  cleanupTracker(tempFilePath: string): void {
    this.trackers.delete(tempFilePath);
  }

  /**
   * 获取统计信息
   */
  getStats(): { trackedFiles: number; totalFingerprints: number } {
    let totalFingerprints = 0;
    for (const tracker of this.trackers.values()) {
      totalFingerprints += tracker.fingerprints.length;
    }

    return {
      trackedFiles: this.trackers.size,
      totalFingerprints,
    };
  }

  /**
   * 清理所有跟踪器
   */
  dispose(): void {
    this.trackers.clear();
  }
}
