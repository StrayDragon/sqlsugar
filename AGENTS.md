<!-- LLMANSPEC:START -->
# LLMAN 规范驱动开发

本项目使用 llman SDD。阅读 `llmanspec/config.yaml` 了解项目上下文与规则。

使用 `/llman-sdd-onboard` 开始，然后使用 `/llman-sdd-*` 技能进行工作流。

保留此托管块，便于 `llman sdd update` 刷新。
<!-- LLMANSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLSugar is a VS Code extension that provides inline SQL editing capabilities with advanced Jinja2 template processing. It's built with TypeScript and uses a modular architecture with dependency injection.

## Common Development Commands

### Building and Development
- `pnpm run compile` - Compile TypeScript with full checks (types + lint + declarations + build)
- `pnpm run package` - Production build with optimizations
- `pnpm run check-types` - Run TypeScript type checking without emitting files
- `pnpm run build:declarations` - Generate TypeScript declaration files for dist/types/
- `node esbuild.js` - Main build script (supports --production, --watch, --extension-only, --webview-only flags)

### Code Quality
- `pnpm run lint` - Run ESLint on src/ directory
- `pnpm run lint:fix` - Auto-fix ESLint issues
- `pnpm run clean` - Remove dist/, out/, and *.vsix files

### Testing
- `pnpm run test` - Run all tests with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:ui` - Run tests with Vitest UI
- `pnpm run test:coverage` - Run tests with coverage reports (80% global, 90% for jinja2/inference)

### Distribution
- `pnpm run vsix` - Package extension as sqlsugar.vsix using vsce

## Architecture Overview

### Core Structure
- **src/core/** - Contains extension core functionality:
  - `extension.ts` - Main extension activation/deactivation logic
  - `di-container.ts` - Dependency injection container for service management
  - `logger.ts` - Centralized logging system
  - `result.ts` - Result type for error handling

### Feature Modules
- **src/features/inline-sql/** - Inline SQL editing functionality:
  - `command-handler.ts` - Handles "Edit Inline SQL" command
  - `temp-file-manager.ts` - Manages temporary SQL file lifecycle
  - `language-handler.ts` - Language-specific SQL processing
  - `indent-sync.ts` - Synchronizes indentation between original and temp files

- **src/features/jinja2/** - Jinja2 template processing with visual editor:
  - `command-handler.ts` - Main command orchestrator
  - `sqlalchemy.ts` - SQLAlchemy integration for database metadata
  - `inference/` - Variable type inference system
  - `ui/` - WebView-based visual editor built with Lit elements

### Build System
- **esbuild.js** - Dual-target build system:
  - Main extension: CommonJS for VS Code runtime compatibility
  - Jinja2 Editor V2: ESM for browser webview compatibility
  - Supports parallel builds and resource copying

### Testing Infrastructure
- **vitest.config.ts** - Configured with jsdom environment and path aliases:
  - `@/` → src/
  - `@features/` → src/features/
  - `@jinja2/` → src/features/jinja2/
  - `vscode` → mocked VS Code API

## Key Technologies

- **Runtime**: VS Code Extension API with TypeScript
- **UI Framework**: Lit (web-based visual editor)
- **Template Engine**: Nunjucks (Jinja2 compatible)
- **Build**: esbuild with dual-target configuration
- **Testing**: Vitest with jsdom and VS Code API mocking
- **Package Manager**: pnpm (enforced by preinstall script)

## Development Notes

### Extension Commands
- `sqlsugar.editInlineSQL` - Opens selected SQL string in temporary file for editing
- `sqlsugar.copyJinja2Template` - Opens visual editor for Jinja2 SQL templates

### Configuration
Extension supports extensive configuration via VS Code settings (`sqlsugar.*` prefix), including:
- Temporary file cleanup behavior
- Jinja2 variable inference rules
- Visual editor appearance and behavior
- SQL syntax highlighting themes

### WebView Integration
The Jinja2 visual editor runs as a VS Code WebView with:
- Lit-based component architecture
- Bidirectional scroll synchronization
- Real-time template rendering
- Intelligent variable type inference