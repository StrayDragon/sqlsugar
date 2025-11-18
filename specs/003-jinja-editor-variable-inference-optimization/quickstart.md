# Quickstart Guide: Enhanced Jinja2 Editor

This guide helps you get started with the enhanced v2 Jinja2 editor featuring advanced variable inference, default scroll synchronization, and comprehensive testing.

## Overview

The enhanced Jinja2 editor provides:

- **Advanced Variable Inference**: Context-aware type detection with confidence scoring
- **Intelligent Default Values**: Contextually appropriate defaults based on variable usage
- **Default Scroll Synchronization**: Automatic template-SQL preview synchronization
- **Comprehensive Testing**: Full test coverage ensuring reliable functionality

## Getting Started

### Installation

The enhanced Jinja2 editor is part of the SQLSugar VS Code extension. No additional installation required.

### Basic Usage

1. **Open a Jinja2 SQL template** in VS Code
2. **Use the command**: `Ctrl+Shift+P` → `SQLSugar: Copy Jinja2 Template`
3. **Experience enhanced features**:
   - Variables are automatically detected with inferred types
   - Scroll synchronization is enabled by default
   - Context-aware default values are provided

## Enhanced Features

### 1. Variable Inference

#### Type Detection

The editor now supports comprehensive type detection:

```typescript
// Basic types (enhanced)
user_id          // → number (database ID)
created_at       // → date (timestamp)
is_active        // → boolean (condition)
email_address    // → email (validated format)

// New advanced types
user_items       // → array (plural pattern + iteration)
profile_data     // → object (structured data)
session_uuid     // → uuid (identifier)
meta_json        // → json (structured storage)
table_name       // → sql_identifier (database object)
```

#### Confidence Scoring

Each variable inference includes a confidence score (0.0-1.0):

- **0.9-1.0**: High confidence (clear patterns, strong evidence)
- **0.7-0.9**: Medium confidence (reasonable inference, some ambiguity)
- **0.5-0.7**: Low confidence (weak evidence, user confirmation recommended)
- **<0.5**: Very low confidence (manual configuration recommended)

#### Context-Aware Defaults

Variables receive contextually appropriate default values:

```jinja2
{% if user_is_active %}              <!-- boolean: true -->
  {% for item in user_items %}       <!-- array: ['item1', 'item2'] -->
    SELECT * FROM {{ table_name }}    <!-- sql_identifier: 'users' -->
    WHERE id = {{ user_id }}          <!-- number: 123 -->
    AND email = '{{ email_address }}' <!-- email: 'test@example.com' %}
  {% endfor %}
{% endif %}
```

### 2. Scroll Synchronization

#### Default Behavior

Scroll synchronization is now **enabled by default**:

- Template ↔ SQL preview scroll positions are synchronized
- Automatic detection of scroll direction and speed
- 16ms throttling for smooth performance

#### Configuration

Access scroll sync settings:

```json
{
  "sqlsugar.v2Editor.scrollSync": {
    "enabled": true,              // Default: enabled
    "sensitivity": 0.8,          // Scroll sensitivity (0.1-1.0)
    "autoEnable": true,          // Enable for new sessions
    "rememberPosition": true     // Remember scroll position
  }
}
```

#### UI Controls

- **Toggle button**: Header button with scroll icon (📜)
- **Keyboard shortcut**: `Ctrl+Alt+S` (customizable)
- **Visual indicator**: Active state shown in header
- **Context menu**: Right-click for quick access

### 3. Enhanced UI Indicators

#### Type Badges

Variables show type information:

- **Badge display**: Colored badges next to variable names
- **Hover information**: Detailed type and confidence information
- **Click to edit**: Direct access to variable configuration

#### Confidence Indicators

Visual feedback for inference confidence:

- **Green**: High confidence (>0.8)
- **Yellow**: Medium confidence (0.6-0.8)
- **Red**: Low confidence (<0.6)

### 4. Advanced Configuration

#### Custom Inference Rules

Define your own variable inference patterns:

```json
{
  "sqlsugar.jinja2TypeInference": {
    "customRules": [
      {
        "name": "project_specific_rule",
        "pattern": "project_.*",
        "type": "string",
        "confidence": 0.9,
        "context": ["project", "database"]
      },
      {
        "name": "timestamp_field",
        "pattern": ".*_timestamp$",
        "type": "date",
        "confidence": 0.95
      }
    ]
  }
}
```

#### Performance Settings

Optimize for your workflow:

```json
{
  "sqlsugar.v2Editor.performance": {
    "enableCaching": true,
    "maxCacheSize": 100,
    "debounceMs": 300,
    "maxTemplateSize": 50000
  }
}
```

## Testing and Validation

### Built-in Testing

Access testing features:

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Run**: `SQLSugar: Test Jinja2 Functionality`
3. **View results**: Test coverage and performance metrics

### Manual Testing Templates

Use these templates to verify functionality:

```jinja2
{# Test 1: Basic variable detection #}
SELECT * FROM users
WHERE id = {{ user_id }}
  AND is_active = {{ is_active }}

{# Test 2: Conditional logic #}
{% if user_has_access %}
  SELECT * FROM premium_features
  WHERE user_id = {{ user_id }}
  AND created_at >= {{ start_date }}
{% endif %}

{# Test 3: Loop iteration #}
{% for item_id in user_items %}
  SELECT * FROM items WHERE id = {{ item_id }}
{% endfor %}

{# Test 4: Complex nesting #}
{% if user.profile.is_verified %}
  {% for doc in user.documents %}
    SELECT '{{ doc.name }}', {{ doc.size }}
    FROM files WHERE id = {{ doc.id }}
  {% endfor %}
{% endif %}
```

### Expected Results

Each test should provide:

- **Variable Detection**: All `{{ variables }}` detected as editable
- **Type Inference**: Appropriate types assigned with confidence scores
- **Default Values**: Contextually appropriate defaults
- **Scroll Sync**: Smooth bidirectional synchronization
- **Performance**: <100ms inference time for typical templates

## Troubleshooting

### Common Issues

#### Variables Not Detected as Editable

**Problem**: Template variables show as text, not clickable elements.

**Solutions**:
1. **Check template syntax**: Ensure valid Jinja2 syntax
2. **Verify patterns**: Variables must be in `{{ variable }}` format
3. **Check size**: Large templates (>50KB) may need manual processing
4. **Refresh analysis**: Use `Ctrl+Shift+P` → `SQLSugar: Reanalyze Template`

#### Incorrect Type Inference

**Problem**: Variables assigned wrong types or defaults.

**Solutions**:
1. **Add custom rules**: Configure project-specific patterns
2. **Adjust confidence threshold**: Lower for more sensitive detection
3. **Manual override**: Click variables to set correct types
4. **Check context**: Ensure variables used in appropriate contexts

#### Scroll Sync Not Working

**Problem**: Template and SQL preview don't scroll together.

**Solutions**:
1. **Check enabled state**: Verify scroll sync is enabled
2. **Reset position**: Use toggle button to reset sync
3. **Check sensitivity**: Adjust sensitivity settings
4. **Performance**: Check if template is too large

#### Performance Issues

**Problem**: Slow inference or UI lag.

**Solutions**:
1. **Enable caching**: Verify performance settings
2. **Reduce template size**: Split large templates
3. **Increase debounce**: Raise debounce timing
4. **Disable features**: Turn off unused features

### Debug Information

Access debug information:

```typescript
// In developer console
window.sqlSugarDebug = {
  getInferenceState: () => extension.inference.getState(),
  getPerformanceMetrics: () => extension.performance.getMetrics(),
  getCacheStatus: () => extension.cache.getStatus()
};
```

### Error Logs

Check extension logs:

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Run**: `Developer: Show Logs`
3. **Select**: "Extension Host"
4. **Filter**: Search for "sqlsugar" entries

## Migration from Previous Versions

### Backward Compatibility

Existing configurations remain functional:

- Old settings automatically migrated
- Custom rules preserved
- User preferences maintained
- Keyboard shortcuts unchanged

### New Defaults

Some defaults have changed:

- **Scroll sync**: Now enabled by default (was disabled)
- **Type inference**: Enhanced with more types
- **Performance**: Optimized caching enabled

### Manual Migration

If needed, reset to defaults:

```json
{
  "sqlsugar.v2Editor.scrollSync.enabled": true,
  "sqlsugar.jinja2TypeInference.advancedInference": true,
  "sqlsugar.v2Editor.ui.showTypeBadges": true
}
```

## Best Practices

### Template Design

1. **Clear naming**: Use descriptive variable names
2. **Consistent patterns**: Follow naming conventions
3. **Appropriate context**: Use variables in expected contexts
4. **Documentation**: Add comments for complex logic

### Configuration

1. **Start with defaults**: Use provided settings as baseline
2. **Customize gradually**: Add custom rules as needed
3. **Test thoroughly**: Verify with your templates
4. **Monitor performance**: Adjust settings for large templates

### Performance

1. **Template size**: Keep templates under 50KB for best performance
2. **Variable count**: Limit to <100 variables per template
3. **Caching**: Enable caching for frequently used templates
4. **Debouncing**: Adjust timing for your workflow

## Support and Feedback

### Getting Help

- **Documentation**: Extension documentation
- **Issues**: Report problems on GitHub
- **Community**: VS Code Marketplace discussions
- **Examples**: Template library and examples

### Providing Feedback

Help improve the editor:

1. **Report issues**: Detailed bug reports
2. **Feature requests**: Suggest improvements
3. **Performance data**: Share metrics from your templates
4. **User experience**: Describe your workflow and pain points

### Contributing

Contribute to the project:

- **Test cases**: Add template examples
- **Documentation**: Improve guides
- **Bug fixes**: Submit pull requests
- **Translation**: Help with localization

---

**Enjoy the enhanced Jinja2 editor experience!** 🚀