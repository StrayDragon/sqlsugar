/**
 * Jinja2 模板预处理器 — 将模板语法替换为合法 SQL 占位符，便于 parser 处理
 */

export interface PreprocessResult {
  processedSQL: string;
  placeholders: PlaceholderEntry[];
}

interface PlaceholderEntry {
  placeholder: string;
  original: string;
  startOffset: number;
  endOffset: number;
  type: 'variable' | 'block_start' | 'block_end';
}

export class TemplatePreprocessor {
  private varCounter = 0;
  private blockCounter = 0;

  preprocess(template: string): PreprocessResult {
    this.varCounter = 0;
    this.blockCounter = 0;
    const placeholders: PlaceholderEntry[] = [];
    let result = template;
    let offset = 0;


    result = result.replace(/\{\{([^}]*)\}\}/g, (match, _content, matchOffset) => {
      const placeholder = `__J2_VAR_${this.varCounter}__`;
      placeholders.push({
        placeholder,
        original: match,
        startOffset: matchOffset - offset,
        endOffset: matchOffset - offset + placeholder.length,
        type: 'variable',
      });
      offset += match.length - placeholder.length;
      this.varCounter++;
      return placeholder;
    });


    result = result.replace(/\{%([^%]*?)%\}/g, (match, _content, matchOffset) => {
      const placeholder = `/* __J2_BLOCK_${this.blockCounter}__ */`;
      placeholders.push({
        placeholder,
        original: match,
        startOffset: matchOffset - offset,
        endOffset: matchOffset - offset + placeholder.length,
        type: 'block_start',
      });
      offset += match.length - placeholder.length;
      this.blockCounter++;
      return placeholder;
    });


    result = result.replace(/\{#([^#]*?)#\}/g, (match, _content, matchOffset) => {
      const placeholder = `/* __J2_COMMENT__ */`;
      placeholders.push({
        placeholder,
        original: match,
        startOffset: matchOffset - offset,
        endOffset: matchOffset - offset + placeholder.length,
        type: 'block_start',
      });
      offset += match.length - placeholder.length;
      return placeholder;
    });

    return { processedSQL: result, placeholders };
  }

  /**
   * 判断给定的字符偏移是否位于模板占位符区域内（不应产生 diagnostics）
   */
  isInPlaceholderRegion(offset: number, placeholders: PlaceholderEntry[]): boolean {
    return placeholders.some(p => offset >= p.startOffset && offset < p.endOffset);
  }
}
