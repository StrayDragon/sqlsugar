# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLSugar is a VS Code extension that provides advanced inline SQL editing capabilities across multiple programming languages. It focuses on two main features:

1. **Inline SQL Editing** - Synchronous editing of SQL strings in temporary files with ORM-style placeholder support
2. **Jinja2 Template Processing** - Visual editor for Jinja2 SQL templates with real-time rendering and variable management

## Architecture

### Core Structure
- `src/core/` - Core infrastructure (DI container, logging, extension lifecycle)
- `src/features/inline-sql/` - Inline SQL editing functionality
- `src/features/jinja2/` - Jinja2 template processing with advanced WebView UI
- `src/shared/` - Shared types and utilities

### Key Components

**Extension Core (`src/core/extension.ts`)**:
- Uses dependency injection pattern via `DIContainer`
- Registers two main features: inline SQL and Jinja2 processing
- Manages output channel for debugging and logging

**Inline SQL Feature**:
- `command-handler.ts` - Main command execution
- `temp-file-manager.ts` - Temporary file lifecycle management
- `language-handler.ts` - Multi-language SQL string detection
- `indent-sync.ts` - Synchronizes indentation between original and temporary files

**Jinja2 Feature**:
- `processor.ts` - Core Jinja2 template processing using Nunjucks
- `webview.ts` - WebView management
- `ui/` - Complete Lit-based UI components for visual template editing:
  - `jinja2-editor-v2.ts` - Advanced template editor with variable highlighting
  - `sql-preview-v2.ts` - Live SQL preview with syntax highlighting
  - `variable-popover.ts` - Interactive variable editing interface

## Development Commands

### Package Management
```bash
pnpm install --frozen-lockfile    # Install dependencies
```

### Build & Development
```bash
pnpm run compile                  # Build extension (type check + lint + build)
pnpm run check-types             # Type checking only
pnpm run build:declarations      # Generate TypeScript declarations
pnpm run lint                    # ESLint on src/
pnpm run lint:fix                # Auto-fix lint issues
```

### Testing
```bash
pnpm run test                    # Run all tests
pnpm run test:watch              # Watch mode for development
pnpm run test:ui                 # Vitest UI interface
pnpm run test:coverage           # Generate coverage report
```

### Packaging
```bash
pnpm run package                 # Production build with minification
pnpm run vsix                    # Package as .vsix file
just package-vsix                # Alternative via justfile
```

### Code Quality
```bash
just after-ai-write-remove-comments    # Clean unnecessary line comments
```

## Technology Stack

- **Runtime**: Node.js with VS Code Extension API
- **Language**: TypeScript (ES2022 target, CommonJS modules)
- **Build**: esbuild for fast bundling
- **UI**: Lit (web components) for WebView interface
- **Template Engine**: Nunjucks (Jinja2-compatible)
- **Testing**: Vitest with jsdom environment
- **Package Manager**: pnpm (required via `preinstall` hook)

## Configuration

The extension supports extensive configuration via VS Code settings (`sqlsugar.*` prefix):
- Temporary file cleanup behavior
- SQL syntax highlighting themes and font sizes
- Jinja2 variable type inference rules
- V2 editor behavior (animations, keyboard navigation, popover placement)
- Logging levels and clipboard fallback options

## Key Development Notes

### TypeScript Configuration
- Uses CommonJS modules for VS Code compatibility
- Strict type checking enabled with selective relaxations
- Declaration files generated to `dist/types/`

### Build Process
- esbuild handles both development and production builds
- Resources and artifacts directories are copied to dist/
- Production builds include minification and optimization

### Testing Strategy
- Vitest with jsdom for WebView component testing
- VS Code API mocked in test environment
- Coverage reporting available

### WebView Development
- Lit-based components with TypeScript
- Custom design system and animation framework
- SQL syntax highlighting using highlight.js
- Complex state management for template variables

### Dependency Injection
- Custom `DIContainer` manages service lifecycle
- Services registered during extension activation
- Clean separation of concerns between features

## Debugging

The extension provides comprehensive logging through:
- VS Code output channel ("SQLSugar")
- Configurable log levels (`error`, `warn`, `info`, `debug`, `none`)
- WebView console output for UI debugging