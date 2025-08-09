# SQLSugar

Edit inline SQL strings with a dedicated .sql editor and get SQL intelligence (completion and hover) via the sqls language server. This extension no longer performs SQL formatting; please use a formatter extension such as SQLFluff for linting and formatting.

## Features
- One-click “Edit Inline SQL” on selected SQL string to open a temporary .sql file side-by-side for focused editing.
- On save, writes the SQL back to the original string, preserving quotes and triple quotes.
- SQL intelligence: completion and hover info via sqls LSP.
- Built-in integration to start sqls LSP and pass your sqls config file path.

## Requirements
- sqls executable installed and available in PATH, or configure `sqlsugar.sqlsPath` to an absolute path.
- Optional: a running database matching your sqls configuration. This repository includes a Docker-based MySQL 5.7 example under `docker/` and a Python test under `examples/`.

## Usage
1. Select a SQL string in your source file.
2. Run command “Edit Inline SQL” from the editor context menu or Command Palette.
3. A temporary .sql file opens in a new column where you can edit with SQL language features (completion/hover).
4. Save the .sql file to write the changes back to the original string.

## Extension Settings
This extension contributes the following settings:
- `sqlsugar.sqlsPath`: Path to sqls executable (default: `sqls`).
- `sqlsugar.sqlsConfigPath`: Path to sqls configuration file (empty to use default behavior).
- `sqlsugar.tempFileCleanup`: Auto cleanup temporary files (default: true).
- `sqlsugar.cleanupOnClose`: If true, delete temp SQL file on editor close; if false, delete on save when tempFileCleanup is enabled.

Example workspace settings:
```json
{
  "sqlsugar.sqlsConfigPath": "${workspaceFolder}/docker/sqls-config.yml",
  "sqlsugar.tempFileCleanup": true,
  "sqlsugar.cleanupOnClose": true
}
```

## Notes on formatting and linting
- Formatting and linting are intentionally not handled by this extension.
- Recommended: install and configure SQLFluff extension to lint/format your SQL. See the included `.sqlfluff` and workspace settings for examples.

## Notes on sqls
If `sqls` is not on PATH, set `sqlsugar.sqlsPath` to its absolute location. The extension will start the sqls language server on activation of the command and pass the config file via `-config` when `sqlsugar.sqlsConfigPath` is set.

## Release Notes
### 0.0.1
- Initial preview: Inline SQL editing, configurable sqls path and config, temp file workflow.
