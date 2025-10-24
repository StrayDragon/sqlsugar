# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm run compile` - Run type checking, linting, and build declarations
- `pnpm run package` - Build production version with optimizations
- `pnpm run check-types` - Run TypeScript type checking without emitting files
- `pnpm run lint` - Run ESLint on src directory
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run test` - Run tests with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run clean` - Remove dist/, out/, and *.vsix files
- `node esbuild.js` - Build with development settings
- `node esbuild.js --production` - Build with production optimizations
- `node esbuild.js --watch` - Build and watch for changes
- `pnpm run vsix` - Package extension as .vsix file

## Project Architecture

### Core Structure
This is a VS Code extension for inline SQL editing with two main features:

1. **Inline SQL Editor** - Extract SQL strings from code into temporary .sql files for focused editing
2. **Jinja2 Template Editor** - Visual editor for Jinja2 SQL templates with real-time preview

### Entry Points
- `src/extension.ts` - Main extension entry (re-exports from core)
- `src/core/extension.ts` - Core extension activation and deactivation logic
- `src/features/inline-sql/index.ts` - Inline SQL feature registration
- `src/features/jinja2/index.ts` - Jinja2 feature registration

### Key Architectural Patterns

**Dependency Injection**
- Uses `DIContainer` singleton for service management
- Core services registered at extension activation
- Features access services through the container

**Feature Modularization**
- Each feature is self-contained with its own command handlers
- Features register commands and provide cleanup functions
- Clear separation between inline-sql and jinja2 functionality

**Build System**
- Dual build targets: Main extension (CommonJS) + WebView (ESM)
- ESBuild configuration with separate builds for different platforms
- WebView components use Lit framework for modern web components

### Core Components

**Inline SQL Feature** (`src/features/inline-sql/`)
- `command-handler.ts` - Handles `sqlsugar.editInlineSQL` command
- `temp-file-manager.ts` - Creates/manages temporary .sql files
- `language-handler.ts` - Detects programming languages and quote types
- `indent-sync.ts` - Maintains precise indentation between source and temp files

**Jinja2 Feature** (`src/features/jinja2/`)
- `command-handler.ts` - Handles `sqlsugar.copyJinja2Template` command
- `processor.ts` - Nunjucks-based Jinja2 template rendering
- `webview.ts` - WebView panel management
- `ui/` - Complete visual editor built with Lit components

**UI Architecture** (`src/features/jinja2/ui/`)
- Modern web components using Lit framework
- Component-based architecture with reusable UI elements
- Real-time SQL preview with syntax highlighting
- Keyboard navigation and accessibility support
- Theme-aware design system

### Configuration
Extension settings are prefixed with `sqlsugar.`:
- `tempFileCleanup`, `cleanupOnClose` - Temporary file management
- `sqlSyntaxHighlightTheme`, `sqlSyntaxHighlightFontSize` - SQL highlighting
- `v2Editor.*` - Jinja2 editor behavior and appearance
- `jinja2TypeInference.customRules` - Custom type inference rules

### Testing
- Uses Vitest for unit testing
- Test files in `src/test/`
- Coverage reporting available
- Watch mode for development

### Language Support
- **Inline SQL**: Python, JavaScript/TypeScript, and generic quote handling
- **Jinja2**: Full template engine with filters, control structures, and SQLAlchemy integration