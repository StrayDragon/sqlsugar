# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SQLSugar is a VS Code extension that enables inline SQL editing across multiple programming languages with advanced features like Jinja2 template processing. The extension allows developers to edit SQL strings directly in their code with precise synchronization and provides visual editing for Jinja2 SQL templates. SQLSugar focuses on SQL synchronization and works seamlessly with other SQL language server plugins.

## Architecture

### Core Architecture (Refactored 2025-10)

The extension follows a **feature-based modular architecture** with clear separation of concerns:

```
src/
├── core/                          # Core infrastructure
│   ├── extension.ts              # Extension entry point & lifecycle
│   ├── di-container.ts           # Simple dependency injection
│   ├── logger.ts                 # Logging utilities
│   └── result.ts                 # Result type for error handling
├── features/                      # Feature modules
│   ├── inline-sql/               # Inline SQL editing feature
│   │   ├── index.ts             # Feature registration
│   │   ├── command-handler.ts   # Command implementation
│   │   ├── temp-file-manager.ts # Temporary file lifecycle
│   │   ├── language-handler.ts  # Language detection & quotes
│   │   └── indent-sync.ts       # Precise indentation sync
│   └── jinja2/                   # Jinja2 template feature
│       ├── index.ts             # Feature registration
│       ├── command-handler.ts   # Command implementation
│       ├── processor.ts         # Nunjucks template processor
│       ├── webview.ts           # WebView management
│       ├── sqlalchemy.ts        # SQLAlchemy placeholder support
│       └── ui/                  # Jinja2 visual editor (Lit components)
│           ├── editor/          # Editor components
│           ├── components/      # Reusable UI components
│           ├── utils/           # UI utilities
│           ├── styles/          # Styles & animations
│           └── types/           # UI type definitions
├── shared/                       # Shared utilities
│   └── types.ts                 # Common type definitions
└── test/                         # Tests
    └── placeholder.test.ts      # Minimal test placeholder
```

### Key Design Principles

1. **Feature Modularity**: Each major feature (inline-sql, jinja2) is self-contained with its own registration function
2. **Minimal Abstraction**: Simple DI container without decorators or complex patterns
3. **Clear Boundaries**: UI components stay within their feature module (jinja2/ui)
4. **Pragmatic Approach**: Avoid over-engineering; prefer direct solutions

### Core Components

#### Extension Lifecycle (`core/extension.ts`)
- **activate()**: Initializes DI container, registers features
- **deactivate()**: Cleans up resources
- Simple, straightforward entry point without heavy orchestration

#### DI Container (`core/di-container.ts`)
- Lightweight service registry
- Basic `register()` and `get()` methods
- No decorators, no complex lifecycle management

#### Feature Registration Pattern
Each feature module exports a `register*Feature()` function:
```typescript
export function registerInlineSQLFeature(
  container: DIContainer,
  context: vscode.ExtensionContext
): void {
  // Register commands and services
}
```

### Feature Modules

#### Inline SQL Editing (`features/inline-sql/`)
- **Purpose**: Extract SQL from code, edit in dedicated file, sync back
- **Key Components**:
  - `command-handler.ts`: Handles `editInlineSQL` command
  - `temp-file-manager.ts`: Creates/manages temporary SQL files
  - `language-handler.ts`: Detects language, handles quotes
  - `indent-sync.ts`: Maintains precise indentation

#### Jinja2 Templates (`features/jinja2/`)
- **Purpose**: Visual editing of Jinja2 SQL templates with variable substitution
- **Key Components**:
  - `command-handler.ts`: Handles `copyJinja2Template` command
  - `processor.ts`: Nunjucks-based template rendering
  - `webview.ts`: WebView panel management
  - `sqlalchemy.ts`: SQLAlchemy placeholder processing
  - `ui/`: Complete visual editor built with Lit web components

#### Jinja2 Visual Editor (`features/jinja2/ui/`)
- **Technology**: Lit web components for reactive UI
- **Features**:
  - Direct template interaction (click-to-edit variables)
  - Real-time SQL preview
  - Smart type inference
  - Keyboard navigation
  - Syntax highlighting

### Development Guidelines

#### Adding a New Feature
1. Create `src/features/your-feature/` directory
2. Implement `index.ts` with `registerYourFeature()` function
3. Add command handlers and business logic
4. Register in `core/extension.ts`

#### Modifying Existing Features
- Keep changes within feature boundaries
- Update only affected feature module
- Avoid cross-feature dependencies (use shared/ if needed)

#### Testing
- Minimal testing approach: placeholder tests only
- Focus on compilation and type safety
- Manual testing for feature validation

### Build System

- **TypeScript**: Strict mode, ES2022 target
- **esbuild**: Fast bundling for extension and webview
- **Entry Points**:
  - Extension: `src/extension.ts` → `dist/extension.cjs`
  - Webview: `src/features/jinja2/ui/index.ts` → `dist/jinja2-editor-v2/jinja2-editor-v2.js`

### Commands

- `sqlsugar.editInlineSQL`: Open inline SQL editor
- `sqlsugar.copyJinja2Template`: Open Jinja2 visual editor

### Configuration

All settings under `sqlsugar.*` namespace:
- `tempFileCleanup`: Auto cleanup temporary files
- `logLevel`: Logging verbosity
- `v2Editor.*`: Visual editor preferences
- `sqlSyntaxHighlightTheme`: Syntax highlighting theme

## Migration Notes (2025-10 Refactoring)

### What Changed
- **Removed**: `ExtensionCore`, `CommandManager`, `EventHandler`, `MetricsCollector`
- **Simplified**: DI container (no decorators, no complex lifecycle)
- **Reorganized**: Feature-based structure instead of layer-based
- **Moved**: UI components into feature modules where they belong

### What Stayed
- Core functionality unchanged
- All commands work as before
- Configuration compatibility maintained
- Build output structure preserved

## Common Tasks

### Adding a Command
1. Add command to feature's `command-handler.ts`
2. Register in feature's `index.ts`
3. Add to `package.json` contributes section

### Debugging
- Use `Logger.debug()` for development logging
- Check output channel: "SQLSugar"
- Set `sqlsugar.logLevel` to `debug` in settings

### Building
```bash
pnpm run compile    # Full build with type checking
pnpm run build      # Quick build
pnpm test           # Run tests
```

## Dependencies

### Runtime
- `lit`: Web components framework (for visual editor)
- `nunjucks`: Jinja2-compatible template engine
- `highlight.js`: Syntax highlighting

### Development
- `typescript`: Type safety
- `esbuild`: Fast bundling
- `vitest`: Testing framework
- `eslint`: Code linting

## Notes for AI Assistants

- **Architecture**: Feature-based, not layer-based
- **Simplicity**: Prefer direct solutions over abstractions
- **Boundaries**: Keep UI within features, don't promote to global
- **Testing**: Minimal approach, focus on type safety
- **Documentation**: Update this file when architecture changes
