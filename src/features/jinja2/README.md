# Jinja2 Template Feature

## Overview

Provides visual editing for Jinja2 SQL templates with variable substitution, real-time preview, and intelligent type inference.

## Components

### Core
- **command-handler.ts**: Implements `sqlsugar.copyJinja2Template` command
- **processor.ts**: Nunjucks-based Jinja2 template rendering
- **webview.ts**: WebView panel management
- **sqlalchemy.ts**: SQLAlchemy placeholder (`:param`) support

### UI (Visual Editor)
- **ui/editor/**: Main editor components (Jinja2EditorV2, SqlPreviewV2, etc.)
- **ui/components/**: Reusable UI components (Button, Input, Select)
- **ui/utils/**: Utilities (template parser, keyboard navigation, etc.)
- **ui/styles/**: Design system and animations
- **ui/types/**: TypeScript type definitions

## Workflow

1. User selects Jinja2 template in code
2. Command opens visual editor in WebView
3. User edits variables directly in template (click-to-edit)
4. Real-time SQL preview updates
5. On submit, rendered SQL copied to clipboard

## Features

### Template Processing
- **Variable Extraction**: Automatically detects `{{ variable }}` patterns
- **Control Structures**: Supports `{% if %}`, `{% for %}`, etc.
- **Filters**: Jinja2 filters like `|upper`, `|lower`, `|default`
- **Type Inference**: Smart type detection from variable names

### Visual Editor
- **Direct Interaction**: Click variables to edit inline
- **Smart Popovers**: Context-aware editing with positioning
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Syntax Highlighting**: SQL and template syntax highlighting
- **Theme Support**: Adapts to VSCode theme

### SQLAlchemy Support
- Mixed placeholders: Both `{{ jinja2 }}` and `:sqlalchemy` in same template
- Automatic detection and handling
- Separate value prompts for each type

## Technology

- **Lit**: Modern web components framework
- **Nunjucks**: Jinja2-compatible template engine
- **Highlight.js**: Syntax highlighting
- **VSCode Webview API**: Native integration

## Configuration

All settings under `sqlsugar.v2Editor.*`:
- `popoverPlacement`: Popover positioning strategy
- `highlightStyle`: Variable highlight style
- `autoPreview`: Auto-update preview on changes
- `keyboardNavigation`: Enable keyboard shortcuts
- `animationsEnabled`: Enable animations
- `showSuggestions`: Show value suggestions

