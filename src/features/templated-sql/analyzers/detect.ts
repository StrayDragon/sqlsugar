/**
 * Detect which parameter analyzers match the given SQL/template content.
 */
import { AnalyzerPipeline } from './analyzer-pipeline';
import { TemplateExpressionAnalyzer } from './jinja2-analyzer';
import { NamedParamAnalyzer } from './named-param-analyzer';
import { NumericParamAnalyzer } from './numeric-param-analyzer';
import { PyformatParamAnalyzer } from './pyformat-param-analyzer';
import { AsyncpgParamAnalyzer } from './asyncpg-param-analyzer';

const FALLBACK_ANALYZERS = ['jinja2', 'named'] as const;
const ANALYZER_ORDER = ['jinja2', 'named', 'numeric', 'pyformat', 'asyncpg'] as const;

function createDetectionPipeline(): AnalyzerPipeline {
  const pipeline = new AnalyzerPipeline();
  pipeline.register(new TemplateExpressionAnalyzer());
  pipeline.register(new NamedParamAnalyzer());
  pipeline.register(new NumericParamAnalyzer());
  pipeline.register(new PyformatParamAnalyzer());
  pipeline.register(new AsyncpgParamAnalyzer());
  return pipeline;
}

/**
 * Return analyzer names that should be enabled for `sql` in auto mode.
 * Content-based; falls back to jinja2+named when nothing matches.
 */
export function detectEnabledAnalyzers(sql: string): string[] {
  const text = String(sql ?? '');
  const found = new Set<string>();

  if (/\{\{|\{%|\{#/.test(text)) {
    found.add('jinja2');
  }

  const pipeline = createDetectionPipeline();
  const result = pipeline.execute(text);

  for (const [name, analyzerResult] of result.analyzerResults) {
    if (analyzerResult.hasResults) {
      found.add(name);
    }
  }

  if (found.size === 0) {
    return [...FALLBACK_ANALYZERS];
  }

  return ANALYZER_ORDER.filter(name => found.has(name));
}
