# Inline SQL Editing Feature

## Overview

Enables editing SQL strings embedded in code (Python, JavaScript, TypeScript, etc.) in a dedicated SQL file with automatic synchronization back to the source.

## Components

- **command-handler.ts**: Implements `sqlsugar.editInlineSQL` command
- **temp-file-manager.ts**: Creates and manages temporary SQL files
- **language-handler.ts**: Detects programming language and handles quote types
- **indent-sync.ts**: Maintains precise indentation between source and temp file

## Workflow

1. User selects SQL string in code
2. Command extracts SQL, removes quotes
3. Creates temporary `.sql` file in `.vscode/sqlsugar/temp/`
4. Opens temp file in side-by-side editor
5. On save, syncs changes back to original file
6. Preserves indentation and quote style

## Supported Languages

- Python (single, double, triple quotes, f-strings)
- JavaScript/TypeScript (single, double, template literals)
- Generic (basic quote handling)

## Key Features

- **Smart Quote Detection**: Automatically detects and preserves quote style
- **Precise Indentation**: Maintains exact indentation from original code
- **SQL Validation**: Warns if selected text doesn't look like SQL
- **Automatic Cleanup**: Removes temp files when editor closes

