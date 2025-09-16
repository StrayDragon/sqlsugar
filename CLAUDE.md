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
- Main extension logic with ~940 lines of code
- Handles the `editInlineSQL` command
- Manages sqls Language Server Protocol client
- Contains intelligent quote handling for different programming languages
- Includes database connection switching functionality

**Additional Components**:
- `src/indentationAnalyzer.ts` - Handles Python multi-line SQL indentation preservation with sophisticated pattern analysis
- `src/sql-log-parser.ts` - Parses SQLAlchemy logs from terminal output and extracts SQL with parameters using regex patterns
- `src/terminal-monitor.ts` - Monitors terminal output for SQL log detection using VS Code terminal API
- `src/clipboard-manager.ts` - Handles clipboard operations with cross-platform fallback support
- `src/test/extension.test.ts` - Comprehensive test suite with 1500+ lines
- `src/test/sql-log-parser.test.ts` - Tests for SQL log parsing functionality
- `src/test/indentationAnalyzer.test.ts` - Tests for indentation pattern detection
- `src/test/connection-switching.test.ts` - Tests for database connection management
- `src/test/sqlalchemy-generator-patterns.test.ts` - Tests for SQLAlchemy log pattern recognition

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

### Advanced Configuration
The `sqlsConfigPath` supports variable substitution:
- `${workspaceFolder}` - Resolves to the current workspace folder
- `${env:VAR_NAME}` - Resolves to environment variable values
- Example: `${workspaceFolder}/docker/sqls-config.yml` or `${env:HOME}/.config/sqls/config.yml`

### Terminal SQL Extraction

The extension now supports extracting SQL from terminal output containing SQLAlchemy logs. This feature can:

**Parse various SQLAlchemy log formats**:
- Standard format: `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)`
- Debug format: `DEBUG sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = ?`
- Generic SQL detection with placeholders

**Handle multiple parameter formats**:
- Tuple format: `('Alice', 25, True)`
- Dictionary format: `{'user_id': 123, 'name': 'Bob'}`
- List format: `[1, 2, 3]`

**Smart parameter injection**:
- Automatic type conversion (strings, numbers, booleans, null values)
- Proper SQL literal formatting with escaping
- Support for complex nested structures

**Usage**:
1. Select SQLAlchemy log output in the terminal
2. Run the "SQLSugar: Copy SQL (Injected)" command
3. The extension will extract SQL, inject parameters, and copy to clipboard

**Supported platforms**:
- Linux: xclip, wl-copy, xsel
- macOS: pbcopy
- Windows: clip
- VS Code native clipboard API

### File Structure

```
src/
├── extension.ts          # Main extension logic
├── indentationAnalyzer.ts # Python indentation handling
├── sql-log-parser.ts     # SQLAlchemy log parsing
├── terminal-monitor.ts   # Terminal output monitoring
├── clipboard-manager.ts  # Clipboard operations
└── test/
    ├── extension.test.ts    # Extension tests
    └── sql-log-parser.test.ts # SQL log parser tests

dist/                    # Built extension (generated)
docs/                    # Documentation and planning
├── plan/                # Feature planning documents
└── todo.md             # Task tracking

docker/                  # Docker setup for testing (sqls config examples)
debug/                   # Debug tools and test data
└── generate_sqlalchemy_logs.py # SQLAlchemy log generator
examples/                # Example usage files
```

## Development Guidelines

### Working with the Extension
- The main command is `sqlsugar.editInlineSQL` which handles the core workflow
- Test environment is detected via `process.env.VSCODE_TEST` for metrics tracking
- Language detection uses VS Code's language ID first, then falls back to file extensions
- Quote handling is complex and language-specific - test changes carefully
- Database connections are loaded from sqls configuration files

### Key Functions to Understand
- `stripQuotes()` - Removes quotes from SQL strings while preserving prefixes
- `wrapLikeIntelligent()` - Smart quote wrapping based on language and content
- `convertPlaceholdersToTemp()` - Converts ORM placeholders for sqls compatibility
- `detectLanguage()` - Determines programming language for quote handling
- `selectQuoteType()` - Chooses appropriate quote type based on content
- `applyIndentation()` - Preserves Python multi-line string indentation
- `extractIndentInfo()` - Analyzes original indentation patterns

### Terminal SQL Extraction Functions
- `SQLLogParser.processSelectedText()` - Main entry point for parsing terminal text
- `SQLLogParser.parseTerminalText()` - Parses multi-line terminal output
- `SQLLogParser.injectParameters()` - Injects parameters into SQL with proper formatting
- `SQLLogParser.parseTupleParameters()` - Parses tuple-style parameters like `(1, 'Alice', True)`
- `SQLLogParser.parseDictParameters()` - Parses dictionary parameters like `{'name': 'Alice'}`
- `SQLLogParser.parseSingleValue()` - Converts string values to appropriate JavaScript types
- `TerminalMonitor.getSelectedText()` - Gets selected text from terminal or clipboard
- `ClipboardManager.copyText()` - Copies text with platform-specific fallbacks

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
- Test terminal SQL extraction with various parameter formats
- Use the `sqlsugar.generateTestLogs` command to generate comprehensive SQLAlchemy test logs
- Test parameter injection with different data types (strings, numbers, booleans, nulls, dates)
- Verify clipboard operations work across different platforms
- Test edge cases like malformed parameters, escaped characters, and multi-line parameters
- Use `sqlsugar.toggleDebugMode` to enable debug logging for troubleshooting
- Use `sqlsugar.testClipboard` to test clipboard functionality across platforms

### Development Tools and Debugging
The extension includes several developer-facing commands:
- `sqlsugar._devGetMetrics` - Shows resource usage metrics (active disposables, temp files, command invocations)
- `sqlsugar.toggleDebugMode` - Enables/disables debug logging for troubleshooting
- `sqlsugar.generateTestLogs` - Generates comprehensive SQLAlchemy test logs
- `sqlsugar.testClipboard` - Tests clipboard functionality and shows platform-specific tools

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