# Quickstart Guide: Jinja2 V2 Editor UX Optimization

## Overview

This quickstart guide provides developers with the essential information to implement variable memory persistence and enhanced type inference features for the SQLSugar Jinja2 V2 editor.

## Prerequisites

- Familiarity with the existing SQLSugar extension architecture
- Understanding of VS Code Extension API
- TypeScript and Lit web components knowledge
- Access to the SQLSugar codebase (`src/features/jinja2/` directory)

## Core Components Overview

### 1. Variable Memory System

**Key Files to Modify:**
- `src/features/jinja2/ui/utils/variable-state-manager.ts` - Add memory persistence
- `src/features/jinja2/processor.ts` - Add template fingerprinting
- `src/features/jinja2/command-handler.ts` - Integrate memory operations

**Core Classes:**
```typescript
// New class to add
class VariableMemoryService {
  constructor(private context: vscode.ExtensionContext)
  async saveVariableValues(template: string, variables: Record<string, Jinja2VariableValue>)
  async loadVariableValues(template: string): Promise<Record<string, Jinja2VariableValue> | null>
}

// Enhanced existing class
class VariableStateManager {
  // Add memory persistence methods
  private memoryService: VariableMemoryService
  async saveToMemory(variableName: string, value: Jinja2VariableValue, type: Jinja2VariableType)
  async loadFromMemory(variableName: string): Promise<VariableMemory | null>
}
```

### 2. Enhanced Type Inference

**Key Files to Modify:**
- `src/features/jinja2/ui/utils/variable-utils.ts` - Add enhanced inference functions
- `src/features/jinja2/ui/components/variable-popover.ts` - Display confidence indicators
- `src/features/jinja2/ui/components/jinja2-editor-v2.ts` - Show memory indicators

**Core Functions:**
```typescript
// New functions to add
function inferVariableTypeEnhanced(
  variableName: string,
  context: VariableContext,
  currentValue?: Jinja2VariableValue
): TypeInferenceResult

function analyzeTemplateContext(template: string): TemplateContext
function extractControlStructures(template: string): ControlStructure[]
```

## Implementation Steps

### Step 1: Variable Memory Infrastructure

1. **Create VariableMemoryService class**
```typescript
// src/features/jinja2/ui/utils/variable-memory-service.ts
export class VariableMemoryService {
  constructor(private context: vscode.ExtensionContext) {}

  generateFingerprint(template: string): TemplateFingerprint {
    // Implementation using SHA-256 and structure analysis
  }

  async saveVariableValues(
    template: string,
    variables: Record<string, Jinja2VariableValue>
  ): Promise<void> {
    const fingerprint = this.generateFingerprint(template);
    const storageKey = `sqlsugar.variables.${fingerprint.structureHash}`;
    await this.context.globalState.update(storageKey, variables);
  }

  async loadVariableValues(template: string): Promise<Record<string, Jinja2VariableValue> | null> {
    const fingerprint = this.generateFingerprint(template);
    const storageKey = `sqlsugar.variables.${fingerprint.structureHash}`;
    return this.context.globalState.get(storageKey);
  }
}
```

2. **Enhance VariableStateManager**
```typescript
// Add to existing VariableStateManager class
export class VariableStateManager {
  constructor(
    variables: EnhancedVariable[],
    onChange: (name: string, value: Jinja2VariableValue, type: string) => void,
    private memoryService?: VariableMemoryService,
    private templateFingerprint?: string
  ) {
    // existing constructor code...
  }

  // Override updateValue method to include memory persistence
  updateValue(
    variableName: string,
    value: Jinja2VariableValue,
    type: string,
    source: 'user' | 'default' | 'inferred' | 'suggestion' = 'user'
  ): boolean {
    const result = super.updateValue(variableName, value, type, source);

    // Auto-save to memory for user inputs
    if (result && source === 'user' && this.memoryService && this.templateFingerprint) {
      this.memoryService.saveVariableValues(this.templateFingerprint, this.getAllValues())
        .catch(error => console.error('Failed to save to memory:', error));
    }

    return result;
  }
}
```

### Step 2: Enhanced Type Inference

1. **Add type inference utilities**
```typescript
// Add to variable-utils.ts
export function inferVariableTypeEnhanced(
  variableName: string,
  context: VariableContext,
  currentValue?: Jinja2VariableValue
): TypeInferenceResult {
  const reasons: string[] = [];
  let confidence = 0;
  let type: Jinja2VariableType = 'string';

  // Naming-based inference (existing logic)
  const namingInference = inferVariableTypeFromName(variableName);
  if (namingInference.confidence > 0.7) {
    type = namingInference.type;
    confidence = namingInference.confidence;
    reasons.push(...namingInference.reasons);
  }

  // Contextual inference (NEW)
  if (context.controlStructures) {
    for (const structure of context.controlStructures) {
      const contextInference = inferTypeFromContext(variableName, structure);
      if (contextInference.confidence > confidence) {
        type = contextInference.type;
        confidence = contextInference.confidence;
        reasons.push(contextInference.reason);
      }
    }
  }

  // Current value analysis
  if (currentValue !== undefined && currentValue !== null) {
    const valueInference = inferTypeFromValue(currentValue);
    if (valueInference.confidence > confidence) {
      type = valueInference.type;
      confidence = valueInference.confidence;
      reasons.push(`Value analysis: ${valueInference.reason}`);
    }
  }

  return {
    type,
    confidence,
    reasons,
    source: confidence > 0.8 ? 'context' : 'naming'
  };
}

function inferTypeFromContext(variableName: string, structure: ControlStructure): TypeInferenceResult {
  switch (structure.type) {
    case 'if':
      if (structure.condition?.includes(variableName)) {
        return {
          type: 'boolean',
          confidence: 0.9,
          reason: `Used in {% if %} condition`,
          source: 'context'
        };
      }
      break;

    case 'for':
      if (structure.iterator === variableName) {
        return {
          type: 'object',
          confidence: 0.85,
          reason: `Loop iterator in {% for %}`,
          source: 'context'
        };
      }
      if (structure.collection === variableName) {
        return {
          type: 'array',
          confidence: 0.85,
          reason: `Collection in {% for %}`,
          source: 'context'
        };
      }
      break;
  }

  return { type: 'string', confidence: 0, reason: '', source: 'context' };
}
```

### Step 3: UI Integration

1. **Update Variable Popover**
```typescript
// In variable-popover.ts, enhance render method
override render() {
  if (!this.variable || !this.isVisible) return null;

  // Enhanced type inference
  const typeInference = this.variable.context ?
    inferVariableTypeEnhanced(this.variable.name, this.variable.context, this.currentValue) : null;

  return html`
    <div class="popover-header">
      <div class="variable-info">
        <div class="variable-name">
          ${this.variable.name}
          ${this.variable.isRequired ? html`<span class="required-badge">Required</span>` : ''}

          <!-- Memory indicators -->
          ${this.variable.isRemembered ? html`
            <span class="memory-indicator remembered"
                  title="Remembered value (${(this.variable.memoryConfidence! * 100).toFixed(0)}% confidence)">
              📝 ${(this.variable.memoryConfidence! * 100).toFixed(0)}%
            </span>
          ` : ''}

          <!-- Inference indicators -->
          ${typeInference && typeInference.confidence < 1.0 ? html`
            <span class="inference-indicator"
                  title="Type inferred with ${(typeInference.confidence * 100).toFixed(0)}% confidence">
              🤔 ${(typeInference.confidence * 100).toFixed(0)}%
            </span>
          ` : ''}
        </div>

        <div class="variable-type">
          ${this.localType}
          ${typeInference ? html`
            <span class="inference-confidence" style="opacity: ${typeInference.confidence}">
              (${(typeInference.confidence * 100).toFixed(0)}%)
            </span>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Enhanced details section -->
    ${typeInference && typeInference.reasons.length > 0 ? html`
      <div class="inference-details">
        <div class="form-label">Type Inference</div>
        <div class="inference-reasons">
          ${typeInference.reasons.map(reason => html`<div class="reason-item">• ${reason}</div>`)}
        </div>
      </div>
    ` : ''}
  `;
}
```

2. **Add CSS for new indicators**
```css
/* Add to variable-popover.ts styles */
.memory-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
  background: rgba(74, 184, 114, 0.2);
  color: var(--vscode-charts-green);
  border: 1px solid var(--vscode-charts-green);
}

.inference-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
  background: rgba(255, 184, 0, 0.2);
  color: var(--vscode-charts-orange);
  border: 1px solid var(--vscode-charts-orange);
}

.inference-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--vscode-widget-border);
}

.reason-item {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin: 2px 0;
}
```

### Step 4: WebView Message Integration

1. **Update webview.ts for new message types**
```typescript
// Add to existing message handlers in webview.ts
private async handleMessage(message: WebViewMessage): Promise<WebViewResponse> {
  switch (message.command) {
    // Existing handlers...

    case 'loadVariableMemory':
      return await this.handleLoadVariableMemory(message.data);

    case 'saveVariableMemory':
      return await this.handleSaveVariableMemory(message.data);

    case 'inferVariableTypes':
      return await this.handleInferVariableTypes(message.data);

    default:
      return { success: false, timestamp: Date.now(), error: { code: 'UNKNOWN_COMMAND', message: `Unknown command: ${message.command}` } };
  }
}

private async handleLoadVariableMemory(data: any): Promise<WebViewResponse> {
  try {
    const memoryData = await this.variableMemoryService.loadVariableValues(data.templateFingerprint);
    return { success: true, timestamp: Date.now(), data: { memoryData } };
  } catch (error) {
    return { success: false, timestamp: Date.now(), error: { code: 'MEMORY_ERROR', message: error.message } };
  }
}
```

## Configuration

Add these settings to the extension's `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "sqlsugar.jinja2VariableMemory.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable variable value memory across editing sessions"
        },
        "sqlsugar.jinja2VariableMemory.showIndicators": {
          "type": "boolean",
          "default": true,
          "description": "Show visual indicators for remembered variable values"
        },
        "sqlsugar.jinja2TypeInference.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable enhanced type inference from template context"
        },
        "sqlsugar.jinja2TypeInference.showConfidence": {
          "type": "boolean",
          "default": true,
          "description": "Show confidence scores for inferred types"
        }
      }
    }
  }
}
```

## Testing

### Unit Tests

```typescript
// Test variable memory persistence
describe('VariableMemoryService', () => {
  test('should save and load variable values', async () => {
    const service = new VariableMemoryService(mockContext);
    const template = 'SELECT * FROM users WHERE id = {{ user_id }}';
    const variables = { user_id: 42 };

    await service.saveVariableValues(template, variables);
    const loaded = await service.loadVariableValues(template);

    expect(loaded).toEqual(variables);
  });
});

// Test type inference
describe('Enhanced Type Inference', () => {
  test('should infer boolean from if condition', () => {
    const context: VariableContext = {
      controlStructures: [{
        type: 'if',
        condition: 'is_active',
        position: { line: 1, column: 1 }
      }]
    };

    const result = inferVariableTypeEnhanced('is_active', context);
    expect(result.type).toBe('boolean');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

## Debugging

Enable debug logging by setting this in VS Code settings:

```json
{
  "sqlsugar.logging.level": "debug"
}
```

Debug output will appear in the "SQLSugar" output channel, showing:
- Template fingerprinting operations
- Memory save/load operations
- Type inference results with confidence scores
- WebView message exchanges

## Next Steps

1. **Implement the core services** (VariableMemoryService, enhanced type inference)
2. **Update UI components** with memory and confidence indicators
3. **Add comprehensive tests** for all new functionality
4. **Performance testing** with large templates and many variables
5. **User acceptance testing** to validate the UX improvements

This quickstart provides the essential building blocks. Refer to the full implementation plan and data models for complete details on each component.