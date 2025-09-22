# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLSugar is a VS Code extension that enables inline SQL editing across multiple programming languages with sqls LSP support. It allows developers to select SQL strings in their code, edit them in temporary .sql files with full LSP capabilities, and automatically sync changes back to the original source code.

## Development Commands

### Building and Testing
- `pnpm run compile` - Build the extension (runs type checking, linting, and esbuild)
- `pnpm run watch` - Start development watch mode (runs esbuild and tsc in parallel)
- `pnpm run package` - Create production build
- `pnpm run vsix` - Package as .vsix file for distribution
- `pnpm run test` - Run tests using vscode-test
- `pnpm run check-types` - Run TypeScript type checking
- `pnpm run lint` - Run ESLint on src directory

### Justfile Commands (Alternative Task Runner)
- `just package-vsix` or `just pv` - Package as .vsix file
- `just install-local` - Build and install extension locally
- `just clean` - Clean generated files (dist/, out/, *.vsix)
- `just deep-clean` or `just dc` - Clean including node_modules/
- `just backup` - Create backup of current vsix with timestamp
- `just open-vscode` - Open VS Code with proposed APIs enabled

### Development Environment
- Use `pnpm run watch` for development - it builds the extension and watches for changes
- Use F5 in VS Code to launch the extension in debug mode (requires compilation first)
- Tests are run with `vscode-test` framework
- VS Code workspace includes configured tasks for parallel compilation (watch:tsc + watch:esbuild)
- Use `just open-vscode` to open VS Code with proposed APIs enabled for development

## Architecture

### Core Components

**Extension Entry Point** (`src/extension.ts`):
- Lightweight entry point that delegates to `ExtensionCore`
- Handles extension activation/deactivation lifecycle
- Creates and manages the singleton `ExtensionCore` instance

**Core Architecture** (`src/core/`):
- `ExtensionCore` - Main coordinator managing the entire extension lifecycle
- `CommandManager` - Handles all command registrations and executions
- `LanguageHandler` - Manages language detection and quote handling
- `SQLsClientManager` - Manages sqls Language Server Protocol client
- `PreciseIndentSyncManager` - Handles precise indentation synchronization

**Jinja2 Processing**:
- `Jinja2NunjucksHandler` - Main Jinja2 template processing coordinator
- `Jinja2WebviewEditor` - Visual Jinja2 editor with WebView interface
- `Jinja2NunjucksProcessor` - Core Jinja2 template processing logic
- `Jinja2ConditionProcessor` - Handles complex conditional logic in templates
- `Jinja2VariableInput` - Manages variable input and type inference

**Specialized Processors**:
- `SQLAlchemyPlaceholderProcessor` - Handles SQLAlchemy parameter injection
- `IndentationAnalyzer` - Python multi-line SQL indentation preservation

**Test Suite** (`src/test/`):
- Comprehensive test coverage with multiple test files
- Integration tests for all major components
- Specialized tests for Jinja2 processing, WebView functionality, and edge cases

**Key Features**:
- **Multi-language SQL string detection**: Supports Python, JavaScript, TypeScript
- **Intelligent quote handling**: Automatically upgrades quotes when content becomes multi-line (Python: single → triple quotes, JS/TS: maintains original style)
- **ORM placeholder compatibility**: Converts `:placeholder` to `"__:placeholder"` for sqls compatibility and back
- **Temporary file management**: Creates temp SQL files with cleanup options
- **LSP integration**: Starts and manages sqls language server with configurable paths
- **Database connection switching**: UI for switching between database connections
- **Status bar integration**: Shows current database connection
- **Terminal SQL extraction**: Parses SQLAlchemy logs from terminal output and extracts SQL with injected parameters
- **Smart parameter parsing**: Handles various parameter formats (tuples, dictionaries, lists) with proper type conversion
- **Clipboard fallback support**: Works across different platforms with multiple clipboard command support
- **Advanced indentation analysis**: Sophisticated pattern detection for Python multi-line strings including hierarchical, keyword-aligned, and continuation patterns
- **Jinja2 template SQL processing**: Detects Jinja2 syntax in SQL templates and generates demo SQL with realistic values
- **Debug utilities**: Built-in test log generation and metrics tracking for development

### Language-Specific Behaviors

**Python**:
- Detects and preserves string prefixes (f, r, u, fr, etc.)
- Automatically upgrades single quotes to triple quotes for multi-line content
- Smart quote selection to avoid conflicts with content
- Advanced indentation preservation for multi-line strings
- Handles complex indentation patterns (mixed, empty lines, f-strings)

**JavaScript/TypeScript**:
- Currently maintains original quote style (conservative approach)
- Future: May support template literal upgrade (configurable)

**Generic**:
- Falls back to double quotes for unknown languages
- Basic quote preservation

### Configuration Management

The extension supports several configuration options:
- `sqlsugar.sqlsPath`: Path to sqls executable
- `sqlsugar.sqlsConfigPath`: Path to sqls configuration file (supports `${workspaceFolder}` and `${env:VAR_NAME}` variables)
- `sqlsugar.tempFileCleanup`: Auto cleanup temporary files
- `sqlsugar.cleanupOnClose`: When to delete temp files (on close vs on save)
- `sqlsugar.showSQLPreview`: Show preview of original and injected SQL after copying
- `sqlsugar.enableWlCopyFallback`: Enable wl-copy fallback for clipboard operations on Wayland

### Jinja2 Template SQL Support

The extension now supports detecting and processing Jinja2 template SQL using a powerful Python-based processor, allowing you to generate demo SQL from complex templates containing Jinja2 syntax.

**Features**:
- **Accurate Template Processing**: Uses Python's Jinja2 library for reliable template parsing
- **Complex Conditional Support**: Handles complex `{% if %}` statements, nested conditions, and loops
- **Variable Extraction**: Extracts variables from expressions, conditionals, and loops with type inference
- **Smart Type Inference**: Determines variable types from naming patterns (user_name → string, user_age → number, is_active → boolean)
- **Demo SQL Generation**: Replaces variables with realistic demo values based on inferred types
- **Fallback Support**: Includes TypeScript implementation as fallback when Python is unavailable

**Architecture**:
- **Primary Method**: Python script (`scripts/jinja2-simple-processor.py`) with full Jinja2 support
- **Fallback Method**: TypeScript implementation for basic variable detection
- **Dependencies**: Requires `uv` package manager and Python (auto-installs dependencies via script metadata)

**Usage**:
1. Select a Jinja2 template SQL in your editor
2. Right-click and choose "SQLSugar: Copy Jinja2 Template SQL (Generate Demo)"
3. The extension analyzes the template using Python and copies demo SQL to clipboard
4. A notification shows variables found and generated demo SQL

**Example**:
```sql
-- Input Template
SELECT * FROM users
WHERE name = '{{ user_name }}'
  AND age > {{ user_age }}
  AND is_active = {{ is_active }}
  {% if show_created %}AND created_at > '{{ start_date }}'{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit_value }}

-- Generated Demo SQL
SELECT * FROM users
WHERE name = 'demo_user_name'
  AND age > 42
  AND is_active = TRUE
  AND created_at > 'demo_start_date'
ORDER BY created_at DESC
LIMIT 10
```

**Supported Jinja2 Syntax**:
- Variables: `{{ variable_name }}`, `{{ object.property }}`, `{{ variable|filter }}`
- Conditionals: `{% if condition %}...{% elif %}...{% else %}...{% endif %}`
- Complex conditions: `{% if filter_cs_wechat_info_ids %}AND cwi.id IN {{ filter_cs_wechat_info_ids }}{% endif %}`
- Loops: `{% for item in items %}...{% endfor %}`
- Comments: `{# comment #}`
- Filters: `{{ variable|default('value') }}`, `{{ date|strftime('%Y-%m-%d') }}`

**Advanced Example**:
```sql
SELECT * FROM users
WHERE department_id = {{ department_id }}
  AND created_date >= '{{ start_date }}'
  {% if is_active %}AND status = 'active'{% endif %}
  {% if min_amount %}AND total_orders >= {{ min_amount }}{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit }} OFFSET {{ offset }}
```

**Interactive Processing**:
For more advanced processing with interactive variable input, use the VS Code extension command which provides a user-friendly interface for entering variable values and seeing real-time SQL generation.

### Advanced Configuration
The `sqlsConfigPath` supports variable substitution:
- `${workspaceFolder}` - Resolves to the current workspace folder
- `${env:VAR_NAME}` - Resolves to environment variable values
- Example: `${workspaceFolder}/docker/sqls-config.yml` or `${env:HOME}/.config/sqls/config.yml`


### File Structure

```
src/
├── extension.ts                  # Entry point and lifecycle management
├── core/                        # Core architecture components
│   ├── extension-core.ts        # Main extension coordinator
│   ├── command-manager.ts       # Command registration and handling
│   ├── language-handler.ts      # Language detection and quote handling
│   ├── sqls-client-manager.ts   # sqls LSP client management
│   └── precise-indent-sync.ts   # Indentation synchronization
├── jinja2-*.ts                  # Jinja2 template processing modules
│   ├── jinja2-nunjucks-handler.ts    # Main Jinja2 coordinator
│   ├── jinja2-webview.ts             # Visual editor interface
│   ├── jinja2-nunjucks-processor.ts  # Core template processing
│   ├── jinja2-condition-processor.ts # Conditional logic handling
│   └── jinja2-variable-input.ts      # Variable extraction and typing
├── sqlalchemy-placeholder-processor.ts  # SQLAlchemy parameter handling
└── indentationAnalyzer.ts       # Python indentation analysis
└── test/
    ├── extension.test.ts            # Core extension tests
    ├── connection-switching.test.ts  # Database connection tests
    ├── indentationAnalyzer.test.ts   # Indentation handling tests
    ├── jinja2-*.test.ts              # Comprehensive Jinja2 tests
    └── webview-logic.test.ts         # WebView interface tests

dist/                    # Built extension (generated)
docs/                    # Documentation and planning
├── plan/                # Feature planning documents
└── todo.md             # Task tracking

docker/                  # Docker setup for testing (sqls config examples)
debug/                   # Debug tools and test data
└── test-*.js            # Manual testing utilities
examples/                # Example usage files
├── jinja2-example.sql    # Jinja2 template SQL example
└── python-example.py     # Python example with Jinja2 templates
scripts/                 # Python scripts for advanced processing
└── jinja2-simple-processor.py  # Python Jinja2 processor
```

## Development Guidelines

### Working with the Extension
- **Architecture**: Uses singleton pattern with `ExtensionCore` as the main coordinator
- **Main Workflow**: `sqlsugar.editInlineSQL` command creates temporary SQL files with LSP support
- **Test Environment**: Detected via `process.env.VSCODE_TEST` for metrics tracking
- **Language Detection**: Uses VS Code's language ID first, then falls back to file extensions
- **Quote Handling**: Complex and language-specific - test changes carefully
- **Database Connections**: Loaded from sqls YAML configuration files with status bar integration
- **Component Communication**: Core components communicate through well-defined interfaces
- **Resource Management**: All disposables are properly managed to prevent memory leaks

### Key Functions to Understand

**Core Extension Functions**:
- `ExtensionCore.getInstance()` - Singleton pattern for accessing the extension core
- `ExtensionCore.createTempSQLFile()` - Creates temporary SQL files for editing
- `ExtensionCore.syncTempFileChanges()` - Syncs changes back to original source
- `CommandManager.registerCommands()` - Registers all extension commands

**Language and Quote Handling**:
- `LanguageHandler.looksLikeSQL()` - Determines if selected text appears to be SQL
- `LanguageHandler.detectLanguage()` - Determines programming language for quote handling
- `LanguageHandler.selectQuoteType()` - Chooses appropriate quote type based on content
- `LanguageHandler.stripQuotes()` - Removes quotes while preserving prefixes
- `LanguageHandler.wrapLikeIntelligent()` - Smart quote wrapping based on language

**Jinja2 Template Processing Functions**:
- `Jinja2NunjucksHandler.getInstance()` - Singleton access to Jinja2 processor
- `Jinja2NunjucksHandler.processTemplate()` - Main template processing entry point
- `Jinja2WebviewEditor.showEditor()` - Opens visual Jinja2 editor interface
- `Jinja2VariableInput.extractVariables()` - Extracts variables with type inference
- `Jinja2ConditionProcessor.processConditions()` - Handles complex conditional logic

**Database and LSP Integration**:
- `SQLsClientManager.startClient()` - Starts sqls language server
- `SQLsClientManager.switchConnection()` - Switches database connections
- `SQLsClientManager.loadConnections()` - Loads connections from config files

**Indentation and Synchronization**:
- `PreciseIndentSyncManager.applyIndentation()` - Preserves Python multi-line indentation
- `IndentationAnalyzer.extractIndentInfo()` - Analyzes original indentation patterns
- `PreciseIndentSyncManager.syncChanges()` - Syncs changes with proper indentation

### Database Connection Management
- Connections are loaded from sqls YAML configuration files
- Status bar shows current connection with switching capability
- Connection changes restart the sqls LSP client with new configuration

### Testing
- Use the provided `sqlsugar._devGetMetrics` command for test environment debugging
- Test multi-line scenarios across different languages
- Verify placeholder conversion works correctly
- Test quote preservation and upgrading behavior
- Test indentation preservation for Python multi-line strings
- Test database connection switching functionality
- Use `sqlsugar.toggleDebugMode` to enable debug logging for troubleshooting

### Jinja2 Template Testing
- Test Jinja2 template detection with various syntax patterns (variables, conditionals, loops)
- Verify variable extraction from complex expressions (`{{ user.profile.name }}`, `{{ variable|filter }}`)
- Test type inference with different naming conventions and contexts
- Validate demo SQL generation with realistic placeholder values
- Test edge cases like nested control structures, comments, and complex filters
- Use the examples in `examples/` directory for manual testing
- Run `node test-jinja2-simple.js` for quick functionality verification without VS Code

### Development Tools and Debugging
The extension includes several developer-facing commands:
- `sqlsugar._devGetMetrics` - Shows resource usage metrics (active disposables, temp files, command invocations)
- `sqlsugar.toggleDebugMode` - Enables/disables debug logging for troubleshooting
- `sqlsugar.copyJinja2Template` - Processes Jinja2 template SQL and generates demo SQL

### SQL Integration
- Requires `sqls` language server to be installed and available in PATH
- Supports custom sqls configuration files
- Integration with SQLFluff for formatting (external dependency)
- LSP formatting capabilities are disabled to prevent crashes with placeholders

## Important Notes

- The extension uses a conservative approach for quote handling in JS/TS to avoid forcing style changes
- Temporary files are created in `.vscode/sqlsugar/temp/` within the workspace
- The extension includes comprehensive error handling for file operations and LSP communication
- All disposable resources are properly managed to prevent memory leaks
- The extension handles complex edge cases like time formats (`12:34:56`) and Postgres casts (`::type`)
- Python indentation preservation is sophisticated, handling mixed indentation, empty lines, and f-strings
- Database connection switching provides seamless workflow for multi-database development
- Terminal SQL extraction requires the `terminalDataWriteEvent` API proposal (available in VS Code 1.74+)
- Parameter injection includes proper SQL escaping to prevent injection vulnerabilities
- The extension gracefully handles missing clipboard tools by providing fallback options
- Multi-line parameter parsing supports complex nested structures with proper escape sequence handling
- **WebView JavaScript**: In WebView string templates, use pure JavaScript syntax only, cannot rely on TypeScript compiler
- **Error Handling**: Comprehensive error handling throughout with user-friendly messages
- **Performance**: Optimized for large files and complex templates with lazy loading where appropriate