<!-- LLMANSPEC:START -->
# LLMAN 规范驱动开发

本项目使用 llman SDD。阅读 `llmanspec/config.yaml` 了解项目上下文与规则。

使用 `/llman-sdd-onboard` 开始，然后使用 `/llman-sdd-*` 技能进行工作流。

保留此托管块，便于 `llman sdd update` 刷新。
<!-- LLMANSPEC:END -->

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLSugar is a VS Code extension that provides inline SQL editing capabilities with advanced Jinja2 template processing. It's built with TypeScript and uses a modular architecture with dependency injection.

## Common Development Commands

This project uses a `justfile` for task automation. Below are the primary commands aligned with the justfile recipes.

### Development Setup
- `just install` - Install dependencies (runs `pnpm install --frozen-lockfile`)
- `just build` - Build the extension (runs `pnpm run compile`)
- `just type-check` - Run TypeScript type checking (runs `pnpm run check-types`)
- `just build-declarations` - Generate TypeScript declaration files (runs `pnpm run build:declarations`)

### Code Quality
- `just lint` - Run full linting (type-check + ESLint)
- `just lint-fix` - Auto-fix ESLint issues (runs `pnpm run lint:fix`)
- `just clean` - Remove dist/, out/, and *.vsix files

### Testing
- `just test` - Run unit tests with Vitest
- `just test-coverage` - Run tests with coverage reports
- `just test-watch` - Run tests in watch mode for development
- `just test-ui` - Run tests with Vitest UI

### Quality Assurance Pipelines
- `just pre-commit` - Quick pre-commit check (type-check + tests)
- `just qa` - Full QA pipeline (lint + test-coverage + spec-validate)
- `just ci-local` - Simulate full CI locally (lint + test-coverage + spec-validate + build)

### Specification Management
- `just spec-validate` - Validate llmanspec specs and changes
- `just spec-check` - Check spec staleness

### Packaging and Distribution
- `just package-vsix` - Package extension as .vsix file (runs `pnpm run vsix`)
- `just install-vsix` - Install extension locally for testing
- `just backup` - Create timestamped backup of current .vsix

### Code Hygiene
- `just after-ai-write-remove-comments` - Clean unnecessary line comments in src/

## Architecture Overview

### Core Structure
- **src/core/** - Extension core functionality:
  - `extension.ts` - Main extension activation/deactivation logic
  - `di-container.ts` - Dependency injection container for service management
  - `logger.ts` - Centralized logging system
  - `result.ts` - Result type for error handling
  - `adapters.ts` - Adapter interfaces and implementations
  - `provider-registry.ts` - Provider registry for extensibility

### Shared Modules
- **src/shared/** - Shared utilities and configurations:
  - `jinja2-patterns.ts` - Jinja2 pattern matching utilities
  - `nunjucks-setup.ts` - Nunjucks template engine configuration
  - `types.ts` - Shared type definitions

### Feature Modules
- **src/features/inline-sql/** - Inline SQL editing functionality:
  - `command-handler.ts` - Handles "Edit Inline SQL" command
  - `temp-file-manager.ts` - Manages temporary SQL file lifecycle
  - `language-handler.ts` - Language-specific SQL processing
  - `indent-sync.ts` - Synchronizes indentation between original and temp files

- **src/features/jinja2/** - Jinja2 template processing with visual editor:
  - `command-handler.ts` - Main command orchestrator (Jinja2NunjucksHandler)
  - `sqlalchemy.ts` - SQLAlchemy integration for database metadata
  - `processor.ts` - Core Jinja2/Nunjucks template processor
  - `webview.ts` - WebView editor integration
  - **ui/** - WebView-based visual editor built with Lit elements:
    - **components/** - Lit web components (editor, toolbar, popovers, etc.)
    - **config/** - Editor configuration
    - **styles/** - Design system and animations
    - **types/** - TypeScript type definitions
    - **utils/** - Utility functions (highlighting, caching, parsing)

### Build System
- **esbuild.js** - Dual-target build system:
  - Main extension: CommonJS for VS Code runtime compatibility
  - Jinja2 Editor V2: ESM for browser webview compatibility
  - Supports parallel builds and resource copying
  - Entry points: `src/extension.ts` (main) and `src/features/jinja2/ui/index.ts` (webview)

### Testing Infrastructure
- **vitest.config.ts** - Configured with jsdom environment and path aliases:
  - `@/` → src/
  - `@test` → src/test/
  - `@features/` → src/features/
  - `@jinja2/` → src/features/jinja2/
  - `vscode` → mocked VS Code API
- **src/test/** - Test directory with unit, integration, and visual tests

## Key Technologies

- **Runtime**: VS Code Extension API with TypeScript
- **UI Framework**: Lit 3.x (web-based visual editor)
- **Template Engine**: Nunjucks 3.x (Jinja2 compatible)
- **SQL Parsing**: node-sql-parser, sql-formatter
- **Validation**: Zod 4.x
- **Build**: esbuild with dual-target configuration
- **Testing**: Vitest with jsdom and VS Code API mocking
- **Package Manager**: pnpm 10.x (enforced by preinstall script)

## Development Notes

### Extension Commands
- `sqlsugar.editInlineSQL` - Opens selected SQL string in temporary file for editing
- `sqlsugar.copyJinja2Template` - Opens visual editor for Jinja2 SQL templates

### Configuration
Extension supports extensive configuration via VS Code settings (`sqlsugar.*` prefix), including:
- Temporary file cleanup behavior (`tempFileCleanup`, `cleanupOnClose`)
- Jinja2 variable inference rules (`jinja2TypeInference.customRules`)
- Visual editor appearance and behavior (`v2Editor.*` settings)
- SQL syntax highlighting themes (`sqlSyntaxHighlightTheme`, `sqlSyntaxHighlightFontSize`)
- Clipboard operations (`enableWlCopyFallback` for Linux Wayland)
- Debug logging (`logLevel`)

### WebView Integration
The Jinja2 visual editor runs as a VS Code WebView with:
- Lit-based component architecture
- Bidirectional scroll synchronization
- Real-time template rendering
- Intelligent variable type inference
- Keyboard navigation support
- Animation and transition effects
