# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLSugar is a VS Code extension that enables inline SQL editing across multiple programming languages with advanced features like Jinja2 template processing. The extension allows developers to edit SQL strings directly in their code with precise synchronization and provides visual editing for Jinja2 SQL templates. SQLSugar focuses on SQL synchronization and works seamlessly with other SQL language server plugins.

## Architecture

### Core Architecture
- **ExtensionCore**: Singleton main orchestrator that manages all extension services and lifecycle
- **CommandManager**: Centralized command registration and handling for all extension commands
- **DIContainer**: Dependency injection container for managing service instances
- **LanguageHandler**: Detects and processes different programming languages for SQL extraction
- **TempFileManager**: Manages temporary SQL files and cleanup with precise indentation synchronization
- **PreciseIndentSyncManager**: Maintains exact indentation between original code and temporary SQL files
- **EventHandler**: Manages VS Code event subscriptions and cleanup
- **MetricsCollector**: Collects performance metrics and command usage statistics

### Component Architecture
- **Jinja2Editor**: Lit-based web component for visual Jinja2 template editing
- **WebViewApp**: Lit-based webview application for hosting the Jinja2 editor
- **UI Components**: Reusable Lit components (Button, Input, Select, Card) for consistent UI
- **Variable Utils**: Utilities for Jinja2 variable processing and type inference

### Key Features
1. **Inline SQL Editing**: Extract SQL strings from code, edit in dedicated SQL files with precise synchronization, sync back
2. **Jinja2 Template Processing**: Visual editor for Jinja2 SQL templates with variable inference and type suggestions
3. **ORM Placeholder Support**: Handles placeholders like `:name` and converts them to editable literals
4. **Multi-language Support**: Works with TypeScript, JavaScript, Python, Go, Rust, Java, and more
5. **Language Server Agnostic**: Works with any SQL language server plugin (sqls, SQLTools, etc.)

## Development Commands

### Build and Development
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build the extension (type check + lint + compile)
pnpm run compile
# or
pnpm run build

# Type checking
pnpm run check-types

# Linting
pnpm run lint
pnpm run lint:fix  # Fix issues automatically

# Build type declarations for API
pnpm run build:declarations

# Package as .vsix file
pnpm run vsix
# or
just package-vsix
```

### Justfile Commands
The project uses Just for simplified task management:
```bash
# Show all available commands
just --list

# Development tasks
just install          # Install dependencies
just build           # Build extension
just type-check      # Run type checking
just lint            # Run linting and type checks
just lint-fix        # Fix lint issues automatically

# Packaging
just package-vsix    # Create .vsix package
just install-local   # Install extension locally
just backup          # Create backup of current vsix

# Cleanup
just clean           # Clean generated files
just deep-clean      # Clean including node_modules
```

## Build Configuration

### TypeScript Configuration
- **Main Extension**: `tsconfig.json` - CommonJS output for VS Code/Cursor compatibility
- **Component Build**: `tsconfig.components.json` - ESM output for browser components
- **Declarations**: `tsconfig.declarations.json` - Type declaration generation

### ESBuild Configuration
- **Extension Build**: Outputs to `dist/extension.cjs` (CommonJS)
- **Jinja2 Editor**: Outputs to `dist/jinja2-editor/jinja2-editor.js` (ESM)
- **WebView App**: Outputs to `dist/webview/app.js` (ESM)
- Supports watch mode, production builds, and component-specific builds

### Testing
Currently tests are commented out in CI but the infrastructure exists. The project uses a MySQL service container for integration testing.

## Key Implementation Details

### File Management Strategy
- Temporary SQL files are created in `.vscode/sqlsugar/temp/`
- Files can be cleaned up on save or editor close (configurable)
- Precise indentation synchronization maintains exact formatting

### Language Detection
- Automatic detection of SQL-like strings in various programming languages
- Fallback to user confirmation if detection is uncertain
- Supports multi-line SQL strings with various quote styles

### Jinja2 Processing
- Automatic variable extraction from Jinja2 templates
- Type inference based on variable naming patterns
- Visual editor with real-time template rendering
- Support for custom type inference rules via configuration

### SQL Synchronization
- Precise indentation synchronization between original code and temporary SQL files
- Automatic file cleanup with configurable options
- Seamless integration with any SQL language server plugin
- Focus on synchronization rather than language server functionality

## Code Style and Conventions

### TypeScript
- Use strict TypeScript settings with comprehensive type checking
- Prefer explicit types where helpful, but allow inference when clear
- Use `Result<T, E>` pattern for error handling throughout the codebase
- Follow the established service pattern with dependency injection

### Lit Components
- Use Lit decorators (`@customElement`, `@property`, `@state`)
- Prefer reactive properties and derived state
- Use CSS-in-JS for component styling
- Follow the established component structure with clear separation of concerns

### Error Handling
- Use the `Result<T, E>` monad for consistent error handling
- Log errors with appropriate severity levels
- Provide user-friendly error messages in VS Code notifications
- Graceful degradation for optional features

## Configuration

The extension provides extensive configuration options:
- `sqlsugar.tempFileCleanup`: Auto cleanup temporary files
- `sqlsugar.cleanupOnClose`: Control when temporary files are cleaned up
- `sqlsugar.showSQLPreview`: Show preview of original and injected SQL after copying
- `sqlsugar.jinja2TypeInference.customRules`: Custom type inference rules
- `sqlsugar.sqlSyntaxHighlightTheme`: SQL syntax highlighting theme
- `sqlsugar.enableWlCopyFallback`: Enable wl-copy fallback for clipboard operations on Linux Wayland

## Dependencies

### Runtime Dependencies
- **lit**: Web component framework for UI components
- **nunjucks**: Jinja2 template processing
- **@lit/context**, **@lit/task**: Lit utilities for state management

### Development Dependencies
- **TypeScript**: Type checking and compilation
- **ESLint**: Code linting with TypeScript support
- **ESBuild**: Fast bundling and compilation
- **@vscode/vsce**: VS Code extension packaging

## Extension Points

The extension registers the following commands:
- `sqlsugar.editInlineSQL`: Edit selected SQL text in dedicated file
- `sqlsugar.copyJinja2TemplateWebview`: Visual Jinja2 template editor
- `sqlsugar.toggleDebugMode`: Toggle debug mode
- `sqlsugar.copyJinja2Template`: Process Jinja2 templates (various modes)