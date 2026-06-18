/**
 * Constants for Jinja2 variable inference and processing
 */


export const DEFAULT_VALUES = {
  ID: 123,
  COUNT: 1,
  AGE: 25,
  PRICE_COST: 99.99,
  SIZE_DIMENSION: 100,
  SCORE_RATING: 5,
  LEVEL_INDEX: 1,
  GENERIC: 42,
  EMAIL: 'test@example.com',
  PHONE: '+1-555-123-4567',
  BIRTH_DATE: '1990-01-01',
  TODAY_DATE: new Date().toISOString().split('T')[0],
  FUTURE_DATE_OFFSET_DAYS: 30,
  DEMO_PREFIX: 'demo_',
} as const;


export const BOOLEAN_PATTERNS = {
  NEGATIVE: [
    'deleted', 'remove', 'clear', 'disabled', 'inactive',
    'false', 'hide', 'exclude', 'required', 'optional'
  ],
  POSITIVE: [
    'active', 'enabled', 'visible', 'show', 'include',
    'valid', 'available'
  ],
  AFFIRMATIVE_PREFIXES: ['has_', 'can_', 'should_'],
  NEGATIVE_PREFIXES: ['is_trial', 'is_demo', 'do_not', 'does_not', 'did_not'],
} as const;


export const NUMBER_PATTERNS = {
  ID_SUFFIX: '_id',
  QUANTITY_SUFFIXES: ['_count', '_quantity', '_num'],
  SIZE_KEYWORDS: ['size', 'length', 'width', 'height'],
  FINANCIAL_KEYWORDS: ['price', 'cost', 'amount', 'total'],
  AGE_PATTERNS: ['age', '_age'],
  SCORING_KEYWORDS: ['score', 'rating'],
  LEVEL_KEYWORDS: ['level', 'index'],
} as const;


export const DATE_PATTERNS = {
  KEYWORDS: ['date', 'time', 'created', 'updated', 'modified', 'deleted', 'timestamp'],
  PREFIXES: ['start_', 'begin_', 'end_', 'expires', 'due', 'scheduled'],
  SUFFIXES: ['_at', '_on', '_date', '_time'],
  KEY_DATES: {
    BIRTH: ['birth', 'birthday'],
    CREATION: ['created', 'registered', 'posted'],
    START: ['start', 'begin'],
    END: ['end', 'expires', 'due'],
  },
} as const;


export const STRING_PATTERNS = {
  EMAIL: 'email',
  NAME: 'name',
  TITLE: 'title',
  DESCRIPTION: 'description',
  URL_LINK: ['url', 'link'],
  PHONE: 'phone',
  ADDRESS: 'address',
  CATEGORY_TYPE: ['category', 'type'],
  STATUS: 'status',
} as const;


export const STRING_DEFAULTS = {
  EXAMPLE_NAME: '示例名称',
  EXAMPLE_TITLE: '示例标题',
  EXAMPLE_DESCRIPTION: '示例描述',
  EXAMPLE_URL: 'https://example.com',
  EXAMPLE_ADDRESS: '示例地址',
  DEFAULT_CATEGORY: 'default',
  DEFAULT_STATUS: 'active',
} as const;


export const PROCESSING_CONFIG = {
  MAX_UUID_GENERATION_ATTEMPTS: 16,
  BASE_16: 16,
  BASE_10: 10,
  BINARY_BASE: 1024,
  DECIMAL_BASE: 1000,
  DEFAULT_TRUNCATE_LENGTH: 255,
  DEFAULT_WORD_WRAP_WIDTH: 79,
  DEFAULT_TEMPLATE_PREVIEW_LENGTH: 100,
  DEFAULT_INT_BASE: 10,
  MAX_ITERATIONS_FOR_LRU: 100,
} as const;


export const REGEX_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  FILTER_NAME: /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\([^)]*\))?/,
} as const;


export const JINJA2_KEYWORDS = [
  'if', 'elif', 'else', 'endif',
  'for', 'endfor', 'in',
  'and', 'or', 'not',
  'true', 'false', 'none', 'null',
] as const;
