# Data Model: Jinja Editor Variable Inference Optimization

## Core Entities

### VariableContext

The enhanced representation of a variable detected in a Jinja2 template.

```typescript
interface VariableContext {
  // Basic identification
  name: string;
  displayName: string;
  fullName: string; // For nested access like "user.profile.name"

  // Type inference
  type: VariableType;
  confidence: number; // 0.0 - 1.0
  inferenceSource: InferenceSource;
  alternatives: VariableType[]; // Other possible types with lower confidence

  // Context analysis
  usagePatterns: UsagePattern[];
  scope: VariableScope;
  relationships: VariableRelationship[];

  // Default values
  suggestedDefaults: Jinja2VariableValue[];
  contextualDefault: Jinja2VariableValue;

  // Rendering metadata
  isEditable: boolean;
  positionRanges: SourcePosition[];
  filters: FilterContext[];
}
```

### VariableType (Enhanced)

Expanded type system beyond the current 4 basic types.

```typescript
type VariableType =
  // Basic types (existing)
  | 'string' | 'number' | 'date' | 'boolean'
  // Enhanced types
  | 'array' | 'object' | 'uuid' | 'email' | 'json'
  | 'sql_identifier' | 'url' | 'phone' | 'currency'
  // Specialized types
  | 'custom' | 'unknown';

interface ComplexType {
  type: 'array' | 'object';
  itemType?: VariableType; // For arrays
  properties?: Map<string, VariableType>; // For objects
  isOptional: boolean;
}
```

### InferenceSource

```typescript
interface InferenceSource {
  type: 'pattern' | 'usage' | 'assignment' | 'cross-template' | 'sqlalchemy' | 'custom';
  ruleName?: string;
  confidence: number;
  explanation: string;
}

interface InferenceRule {
  name: string;
  pattern: RegExp;
  type: VariableType;
  confidence: number;
  context?: string[];
  validator?: (context: VariableContext) => boolean;
  priority: number; // Higher = more important
}
```

### UsagePattern

```typescript
interface UsagePattern {
  type: UsageType;
  context: NunjucksNode;
  position: SourcePosition;
  filters: FilterContext[];
  operators?: string[];
  conditions?: string[]; // For conditional usage
}

type UsageType =
  | 'output'           // {{ variable }}
  | 'condition'        // {% if variable %}
  | 'iteration'        // {% for item in variable %}
  | 'assignment'       // {% set variable = value %}
  | 'filter'           // {{ variable | filter }}
  | 'comparison'       // {% if variable == value %}
  | 'member_access'    // {{ variable.property }}
  | 'function_call';   // {{ variable() }}
```

### VariableScope

```typescript
interface VariableScope {
  type: ScopeType;
  level: number;
  parent?: VariableScope;
  children: VariableScope[];
  variables: Map<string, VariableContext>;
}

type ScopeType =
  | 'global' | 'template' | 'block' | 'for' | 'if' | 'macro' | 'with' | 'set';
```

### FilterContext

```typescript
interface FilterContext {
  name: string;
  arguments: Jinja2VariableValue[];
  type: FilterType;
  confidence: number;
}

type FilterType =
  | 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'sql';
```

### VariableRelationship

```typescript
interface VariableRelationship {
  type: 'parent' | 'child' | 'reference' | 'dependency' | 'assignment';
  source: string;
  target: string;
  strength: number; // 0.0 - 1.0
  context: string;
}
```

## Configuration Entities

### UserPreferences

```typescript
interface UserPreferences {
  // Variable inference settings
  inference: InferencePreferences;

  // Scroll synchronization
  scrollSync: ScrollSyncPreferences;

  // UI behavior
  ui: UIPreferences;

  // Performance settings
  performance: PerformancePreferences;
}

interface InferencePreferences {
  enabled: boolean;
  confidenceThreshold: number; // Minimum confidence to auto-accept
  useContextualDefaults: boolean;
  crossTemplateAnalysis: boolean;
  customRules: InferenceRule[];
  typeMapping: Map<string, VariableType>;
}

interface ScrollSyncPreferences {
  enabled: boolean;
  sensitivity: number; // 0.1 - 1.0
  rememberPosition: boolean;
  autoEnable: boolean; // Enable on new sessions
  debounceMs: number; // Scroll debounce timing
}

interface UIPreferences {
  showTypeBadges: boolean;
  showConfidenceIndicators: boolean;
  variableHighlightStyle: 'background' | 'border' | 'underline';
  animateTransitions: boolean;
  keyboardShortcuts: Map<string, string>;
}

interface PerformancePreferences {
  enableCaching: boolean;
  maxCacheSize: number;
  debounceMs: number; // For inference updates
  maxTemplateSize: number; // Size limit for real-time processing
}
```

### EditorConfiguration

```typescript
interface CompleteEditorV2Config {
  // Existing configuration (backward compatible)
  popoverPlacement: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  highlightStyle: 'background' | 'border' | 'underline';
  autoPreview: boolean;
  keyboardNavigation: boolean;
  animationsEnabled: boolean;
  showSuggestions: boolean;
  autoFocusFirst: boolean;

  // Enhanced configuration
  inference: {
    enabled: boolean;
    confidenceThreshold: number;
    contextualDefaults: boolean;
    customRules: InferenceRule[];
  };

  scrollSync: {
    enabled: boolean;
    sensitivity: number;
    autoEnable: boolean;
    rememberSettings: boolean;
  };

  ui: {
    showTypeIndicators: boolean;
    showConfidenceLevel: boolean;
    compactMode: boolean;
    themeIntegration: boolean;
  };
}
```

## State Management

### InferenceState

```typescript
interface InferenceState {
  // Current analysis
  template: string;
  variables: Map<string, VariableContext>;
  inferenceTime: number;

  // Analysis metadata
  templateHash: string;
  lastAnalysis: Date;
  version: string;

  // Performance metrics
  processingTime: number;
  cacheHit: boolean;

  // Errors and warnings
  errors: InferenceError[];
  warnings: InferenceWarning[];
}

interface InferenceError {
  type: 'syntax' | 'parsing' | 'inference' | 'performance';
  message: string;
  position?: SourcePosition;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}

interface InferenceWarning {
  type: 'low_confidence' | 'ambiguous_type' | 'unused_variable' | 'potential_error';
  message: string;
  variable?: string;
  suggestion: string;
}
```

### EditorState

```typescript
interface EditorState {
  // Template and preview
  template: string;
  renderedSQL: string;

  // Variable management
  variables: Map<string, Jinja2VariableValue>;
  variableContexts: Map<string, VariableContext>;

  // UI state
  selectedVariable?: string;
  popoverVisible: boolean;
  popoverPosition?: { x: number; y: number };

  // Scroll synchronization
  scrollSync: {
    enabled: boolean;
    source: 'template' | 'sql' | 'none';
    lastSyncTime: number;
  };

  // View mode
  viewMode: 'split' | 'template-only' | 'sql-only';

  // User interactions
  changeHistory: VariableChangeLog[];
}
```

### VariableChangeLog

```typescript
interface VariableChangeLog {
  timestamp: Date;
  variableName: string;
  oldValue: Jinja2VariableValue;
  newValue: Jinja2VariableValue;
  changeType: 'initial' | 'user_edit' | 'inference_update' | 'revert';
  source: 'user_input' | 'inference' | 'file_load' | 'template_change';
}
```

## Testing Data Structures

### TestTemplate

```typescript
interface TestTemplate {
  name: string;
  description: string;
  template: string;
  category: 'simple' | 'complex' | 'edge_case' | 'performance' | 'user_reported';

  // Expected results
  expectedVariables: ExpectedVariable[];
  expectedSQL?: string;
  expectedWarnings?: string[];

  // Test metadata
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  performanceTarget?: {
    maxInferenceTime: number;
    maxMemoryUsage: number;
  };
}

interface ExpectedVariable {
  name: string;
  type: VariableType;
  confidence: number;
  defaultValues: Jinja2VariableValue[];
  positionRanges: SourcePosition[];
}
```

### TestCoverage

```typescript
interface TestCoverage {
  totalFiles: number;
  testedFiles: number;
  coveragePercentage: number;

  // Coverage by component
  inference: CoverageMetrics;
  ui: CoverageMetrics;
  integration: CoverageMetrics;

  // Coverage by functionality
  variableDetection: CoverageMetrics;
  typeInference: CoverageMetrics;
  scrollSync: CoverageMetrics;
  errorHandling: CoverageMetrics;
}

interface CoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  percentage: number;
}
```

## Performance Optimization

### CacheEntry

```typescript
interface CacheEntry {
  key: string; // Template hash
  value: InferenceState;
  timestamp: Date;
  size: number; // Bytes
  accessCount: number;
  lastAccessed: Date;
  dependencies: string[]; // Other cache keys this depends on
}

interface CacheMetrics {
  size: number; // Current cache size
  maxSize: number; // Maximum allowed size
  hitRate: number; // Cache hit rate percentage
  evictionCount: number; // Number of evictions
  totalHits: number;
  totalMisses: number;
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  template: {
    size: number; // Characters
    complexity: number; // Computed complexity score
    lineCount: number;
    variableCount: number;
  };

  processing: {
    parseTime: number; // ms
    inferenceTime: number; // ms
    renderTime: number; // ms
    totalTime: number; // ms
  };

  memory: {
    used: number; // MB
    peak: number; // MB
    variables: number; // Number of variables in memory
  };

  cache: CacheMetrics;
}
```

## Integration Points

### VSCodeExtensionAPI

```typescript
interface ExtensionAPI {
  // Variable inference API
  analyzeTemplate(template: string): Promise<InferenceState>;
  inferVariableType(variableName: string, context: string): Promise<VariableContext>;
  validateTemplate(template: string): Promise<TemplateValidation>;

  // Configuration API
  getConfiguration(): Promise<CompleteEditorV2Config>;
  updateConfiguration(changes: Partial<CompleteEditorV2Config>): Promise<void>;

  // Testing API (development only)
  runTests(): Promise<TestResults>;
  generateTestCases(): Promise<TestTemplate[]>;
}
```

### TemplateValidation

```typescript
interface TemplateValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metrics: PerformanceMetrics;
}

interface ValidationError {
  type: 'syntax' | 'variable' | 'logic';
  message: string;
  position: SourcePosition;
  severity: 'error' | 'warning';
  autoFixable: boolean;
}

interface ValidationSuggestion {
  type: 'type_correction' | 'variable_rename' | 'template_refactor';
  message: string;
  action: string;
  confidence: number;
}
```

## Migration and Compatibility

### MigrationData

```typescript
interface MigrationData {
  version: string;
  timestamp: Date;
  oldConfiguration: any; // Previous configuration format
  newConfiguration: CompleteEditorV2Config;

  // Migration results
  success: boolean;
  warnings: string[];
  errors: string[];
  userActionRequired: string[];
}
```

### BackwardCompatibility

```typescript
interface LegacyConfiguration {
  // Old configuration formats that need to be supported
  tempFileCleanup?: boolean;
  cleanupOnClose?: boolean;
  showSQLPreview?: boolean;
  sqlSyntaxHighlightTheme?: string;
  sqlSyntaxHighlightFontSize?: number;
  v2Editor?: {
    popoverPlacement?: string;
    highlightStyle?: string;
    autoPreview?: boolean;
    [key: string]: any;
  };
}
```

This comprehensive data model supports the enhanced variable inference system while maintaining backward compatibility and providing extensibility for future improvements.