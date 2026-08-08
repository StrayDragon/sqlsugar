/**
 * Prepare example SQL the same way the extension does before opening the webview:
 * TemplateProcessor.extractVariables + AnalyzerPipeline for param styles.
 */
import { TemplateProcessor } from '../../src/features/templated-sql/processor';
import { AnalyzerPipeline } from '../../src/features/templated-sql/analyzers/analyzer-pipeline';
import { TemplateExpressionAnalyzer } from '../../src/features/templated-sql/analyzers/jinja2-analyzer';
import { NamedParamAnalyzer } from '../../src/features/templated-sql/analyzers/named-param-analyzer';
import { NumericParamAnalyzer } from '../../src/features/templated-sql/analyzers/numeric-param-analyzer';
import { PyformatParamAnalyzer } from '../../src/features/templated-sql/analyzers/pyformat-param-analyzer';
import { AsyncpgParamAnalyzer } from '../../src/features/templated-sql/analyzers/asyncpg-param-analyzer';
import { SQLAlchemyPlaceholderProcessor } from '../../src/features/templated-sql/sqlalchemy';

export interface PreparedExample {
  template: string;
  variables: Array<Record<string, unknown>>;
  warnings: string[];
}

export function prepareExample(template: string): PreparedExample {
  const warnings: string[] = [];
  const processor = TemplateProcessor.getInstance();

  const placeholderDetection = SQLAlchemyPlaceholderProcessor.detectPlaceholderTypes(template);

  const validation = processor.validateTemplate(template);
  if (!validation.valid) {
    warnings.push(...validation.errors.map(e => `template: ${e}`));
  }

  const mixedValidation = SQLAlchemyPlaceholderProcessor.validateMixedPlaceholders(template);
  if (!mixedValidation.valid) {
    warnings.push(...mixedValidation.errors.map(e => `mixed: ${e}`));
  }
  if (mixedValidation.warnings.length > 0) {
    warnings.push(...mixedValidation.warnings);
  }

  const variables = processor.extractVariables(template);

  const analyzerPipeline = new AnalyzerPipeline();
  analyzerPipeline.register(new TemplateExpressionAnalyzer());
  analyzerPipeline.register(new NamedParamAnalyzer());
  analyzerPipeline.register(new NumericParamAnalyzer());
  analyzerPipeline.register(new PyformatParamAnalyzer());
  analyzerPipeline.register(new AsyncpgParamAnalyzer());

  const analysisResult = analyzerPipeline.execute(template);
  const paramVariables = analysisResult.parameters
    .filter(p => p.type !== 'jinja2')
    .map(p => ({
      name: p.name,
      type: 'string' as const,
      description: `${p.type} parameter: ${p.originalText}`,
      paramPattern: p.originalText,
      isRequired: false,
    }));

  if (!placeholderDetection.hasJinja2 && placeholderDetection.hasSQLAlchemy) {
    for (const name of placeholderDetection.sqlalchemyVars) {
      if (!paramVariables.some(v => v.name === name)) {
        paramVariables.push({
          name,
          type: 'string',
          description: `named parameter: :${name}`,
          paramPattern: `:${name}`,
          isRequired: false,
        });
      }
    }
  }

  const allVariables = [...variables, ...paramVariables].map(v => ({
    ...v,
    isRequired: 'isRequired' in v ? Boolean((v as { isRequired?: boolean }).isRequired) : false,
  }));

  return {
    template,
    variables: enrichHarnessDefaults(allVariables, template),
    warnings,
  };
}

/**
 * Extra defaults so complex examples render without TypeError in preview.
 * Mirrors common UI inference the processor may still miss (mapping / in-tests).
 */
function enrichHarnessDefaults(
  variables: Array<Record<string, unknown>>,
  template: string
): Array<Record<string, unknown>> {
  return variables.map(v => {
    const name = String(v.name);
    const lower = name.toLowerCase();
    const filters = Array.isArray(v.filters) ? (v.filters as string[]) : [];
    let defaultValue = v.defaultValue;
    let type = v.type;

    if (
      filters.includes('join') ||
      filters.includes('sql_in') ||
      filters.includes('inclause') ||
      filters.includes('__for_collection__') ||
      /\| *join\b/.test(template) && new RegExp(`{{\\s*${name}\\s*\\|\\s*join`).test(template)
    ) {
      if (!Array.isArray(defaultValue)) {
        defaultValue = lower.includes('id')
          ? [1, 2, 3]
          : lower.includes('column')
            ? ['id', 'name', 'created_at']
            : ['alpha', 'beta'];
      }
      type = 'array';
    }

    // `{% if 'x' in categories %}` / `in tags` needs an array/string sequence
    if (
      (filters.includes('__in_collection__') ||
        lower === 'categories' ||
        lower === 'tags' ||
        lower.endsWith('_names') ||
        lower === 'roles') &&
      !Array.isArray(defaultValue) &&
      lower !== 'filters'
    ) {
      defaultValue = lower.includes('categor')
        ? ['electronics', 'premium']
        : lower.includes('tag')
          ? ['premium', 'sale']
          : ['admin', 'user'];
      type = 'array';
    }

    // filters.status / filters.user_ids object usage
    if (
      (lower === 'filters' || filters.includes('__mapping__')) &&
      (typeof defaultValue !== 'object' || defaultValue === null || Array.isArray(defaultValue))
    ) {
      defaultValue = {
        status: 'active',
        min_amount: 10,
        max_amount: 1000,
        user_ids: [1, 2, 3],
      };
      type = 'json';
    }

    return { ...v, defaultValue, type };
  });
}
