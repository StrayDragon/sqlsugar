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
- **Jinja2EditorV2**: Modern visual editor with improved UX, variable popovers, and keyboard navigation
- **UI Components**: Reusable Lit components (Button, Input, Select) for consistent UI
- **Variable Utils**: Utilities for Jinja2 variable processing and type inference
- **Template Parser**: Advanced template parsing for variable extraction and highlighting
- **Variable State Manager**: State management for variable values and types in the editor

### Key Features
1. **Inline SQL Editing**: Extract SQL strings from code, edit in dedicated SQL files with precise synchronization, sync back
2. **Jinja2 Template Processing**: Visual editor for Jinja2 SQL templates with variable inference and type suggestions
3. **ORM Placeholder Support**: Handles placeholders like `:name` and converts them to editable literals
4. **Multi-language Support**: Works with TypeScript, JavaScript, Python, Go, Rust, Java, and more
5. **Language Server Agnostic**: Works with any SQL language server plugin (sqls, SQLTools, etc.)

## Development Commands

### Core Commands
```bash
# Install dependencies
pnpm install --frozen-lockfile
# or
just install

# Build the extension (type check + lint + compile + declarations)
pnpm run compile
# or
pnpm run build
# or
just build

# Type checking
pnpm run check-types
# or
just type-check

# Linting
pnpm run lint
pnpm run lint:fix  # Fix issues automatically
# or
just lint-fix

# Build type declarations for API
pnpm run build:declarations
# or
just build-declarations

# Package as .vsix file
pnpm run vsix
# or
just package-vsix

# Clean generated files
pnpm run clean
# or
just clean

# Deep clean (including node_modules)
just deep-clean
```

### Justfile Commands
The project uses Just for simplified task management:
```bash
# Show all available commands
just --list
# or
just help

# Development tasks
just install          # Install dependencies
just build           # Build extension
just type-check      # Run type checking
just lint            # Run linting and type checks
just lint-fix        # Fix lint issues automatically

# Code hygiene
just after-ai-write-remove-comments  # Clean unnecessary line comments in src/

# Packaging and distribution
just package-vsix    # Create .vsix package
just install-vsix   # Install extension locally for testing
just backup          # Create backup of current vsix

# Cleanup
just clean           # Clean generated files
just deep-clean      # Clean including node_modules
```

## Build Configuration

### TypeScript Configuration
- **Single Configuration**: `tsconfig.json` - Unified configuration for all builds
  - CommonJS output for VS Code/Cursor extension compatibility
  - Supports both Node.js (extension) and browser (webview) targets
  - Type declaration generation included

### ESBuild Configuration
- **Extension Build**: Outputs to `dist/extension.cjs` (CommonJS)
- **Jinja2 Editor V2**: Outputs to `dist/jinja2-editor-v2/jinja2-editor-v2.js` (ESM)
- Supports watch mode, production builds, and component-specific builds
- Build flags: `--extension-only`, `--webview-only`, `--watch`, `--production`

### Testing
The project uses Vitest for testing with a MySQL service container for integration testing.
```bash
# Run tests
pnpm run test
# or
just test

# Watch mode
pnpm run test:watch

# Test UI
pnpm run test:ui

# Coverage report
pnpm run test:coverage
```

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
- Main extension outputs to CommonJS for VS Code/Cursor compatibility
- Component builds output to ESM for browser compatibility

### Lit Components
- Use Lit decorators (`@customElement`, `@property`, `@state`)
- Prefer reactive properties and derived state
- Use CSS-in-JS for component styling
- Follow the established component structure with clear separation of concerns
- Components are built separately from the main extension

### Error Handling
- Use the `Result<T, E>` monad for consistent error handling
- Log errors with appropriate severity levels
- Provide user-friendly error messages in VS Code notifications
- Graceful degradation for optional features

### Package Manager
- Uses pnpm with lockfile for deterministic builds
- Preinstall script enforces pnpm usage
- Version pinning ensures consistent development environment

## Configuration

The extension provides extensive configuration options:
- `sqlsugar.tempFileCleanup`: Auto cleanup temporary files
- `sqlsugar.cleanupOnClose`: Control when temporary files are cleaned up
- `sqlsugar.showSQLPreview`: Show preview of original and injected SQL after copying
- `sqlsugar.sqlSyntaxHighlightTheme`: SQL syntax highlighting theme
- `sqlsugar.sqlSyntaxHighlightFontSize`: Font size for SQL syntax highlighting
- `sqlsugar.jinja2TypeInference.customRules`: Custom type inference rules
- `sqlsugar.logLevel`: WebView console output level (error, warn, info, debug, none)
- `sqlsugar.enableWlCopyFallback`: Enable wl-copy fallback for clipboard operations on Linux Wayland

#### V2 Editor Configuration
- `sqlsugar.v2Editor.popoverPlacement`: Default placement for variable editing popovers (auto, top, bottom, left, right)
- `sqlsugar.v2Editor.highlightStyle`: Visual style for highlighting variables (background, border, underline)
- `sqlsugar.v2Editor.autoPreview`: Automatically preview SQL when variables change
- `sqlsugar.v2Editor.keyboardNavigation`: Enable keyboard navigation (Tab, Enter, Escape)
- `sqlsugar.v2Editor.animationsEnabled`: Enable animations and transitions
- `sqlsugar.v2Editor.showSuggestions`: Show intelligent value suggestions based on variable names
- `sqlsugar.v2Editor.autoFocusFirst`: Automatically focus the first variable when opening

## Testing and Development

### Testing Infrastructure
- Test infrastructure exists but is currently commented out in CI
- Uses MySQL service container for integration testing
- Test commands are available but not actively maintained

### Development Workflow
1. Install dependencies: `pnpm install --frozen-lockfile`
2. Build extension: `pnpm run compile` or `just build`
3. Package for testing: `just package-vsix`
4. Install locally: `just install-vsix`
5. Debug in VS Code with F5 (requires extension development host)

### Development Tools
- ESBuild for fast compilation and bundling
- ESLint with TypeScript support for code quality
- Multiple TypeScript configurations for different build targets
- Just for simplified task management

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
- `sqlsugar.copyJinja2Template`: Visual Jinja2 template editor with improved UX

### Context Menu Integration
- Commands available in editor context menu when text is selected
- Right-click integration for quick access to SQL editing features
- Visual Jinja2 editor available in context menu
- Seamless integration with existing VS Code workflows
