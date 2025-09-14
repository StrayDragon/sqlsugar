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

### Development Environment
- Use `pnpm run watch` for development - it builds the extension and watches for changes
- Use F5 in VS Code to launch the extension in debug mode (requires compilation first)
- Tests are run with `vscode-test` framework

## Architecture

### Core Components

**Extension Entry Point** (`src/extension.ts`):
- Main extension logic with ~940 lines of code
- Handles the `editInlineSQL` command
- Manages sqls Language Server Protocol client
- Contains intelligent quote handling for different programming languages
- Includes database connection switching functionality

**Additional Components**:
- `src/indentationAnalyzer.ts` - Handles Python multi-line SQL indentation preservation
- `src/test/extension.test.ts` - Comprehensive test suite with 1500+ lines

**Key Features**:
- **Multi-language SQL string detection**: Supports Python, JavaScript, TypeScript
- **Intelligent quote handling**: Automatically upgrades quotes when content becomes multi-line (Python: single → triple quotes, JS/TS: maintains original style)
- **ORM placeholder compatibility**: Converts `:placeholder` to `"__:placeholder"` for sqls compatibility and back
- **Temporary file management**: Creates temp SQL files with cleanup options
- **LSP integration**: Starts and manages sqls language server with configurable paths
- **Database connection switching**: UI for switching between database connections
- **Status bar integration**: Shows current database connection

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

### File Structure

```
src/
├── extension.ts          # Main extension logic
├── indentationAnalyzer.ts # Python indentation handling
└── test/
    └── extension.test.ts # Extension tests

dist/                    # Built extension (generated)
docs/                    # Documentation and planning
├── plan/                # Feature planning documents
└── todo.md             # Task tracking

docker/                  # Docker setup for testing (sqls config examples)
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