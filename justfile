# SQLSugar VS Code Extension - Justfile
# Simplified task runner for packaging, and cleanup

# Default recipe - show available commands
default:
    @just --list

# =============================================================================
# Development Commands
# =============================================================================

# Install dependencies
install:
    pnpm install --frozen-lockfile

# Run development watch mode
dev:
    pnpm run watch

# Build the extension
build:
    pnpm run compile

# Run type checking
type-check:
    pnpm run check-types

# Build type declarations
build-declarations:
    pnpm run build:declarations

# Run tests
test:
    pnpm run test

# Format code
format:
    pnpm run format

# Format check (dry run)
format-check:
    pnpm run format:check

# Run linting (main files only - default)
lint:
    pnpm run lint:main

# Run linting on all files (including jinja2-editor)
lint-all:
    pnpm run lint

# =============================================================================
# Packaging and Distribution
# =============================================================================

# Package as .vsix file for distribution
package-vsix:
    pnpm run vsix

# Install the extension locally for testing
install-local: package-vsix
    code --install-extension sqlsugar.vsix --force

# Create backup of current vsix
backup: package-vsix
    #!/usr/bin/env bash
    set -e
    mkdir -p backups
    cp sqlsugar.vsix "backups/sqlsugar-$(date +%Y%m%d-%H%M%S).vsix"
    echo "✅ Backup created in backups/ directory"

# =============================================================================
# Cleanup Commands
# =============================================================================

# Clean up generated files
clean:
    rm -rf dist/
    rm -rf out/
    rm -f *.vsix

# Deep clean (including node_modules)
deep-clean: clean
    rm -rf node_modules/
    rm -rf .vscode-test/
    rm -rf .vscode/sqlsugar/temp/

# =============================================================================
# Aliases and Shortcuts
# =============================================================================

# Common aliases
alias pv := package-vsix
alias c := clean
alias dc := deep-clean
alias lm := lint
alias la := lint-all
alias bd := build-declarations
alias tc := type-check
alias f := format
alias fc := format-check

# =============================================================================
# Help and Information
# =============================================================================

# Show available commands
help:
    @just --list

# Show project information
info:
    @echo "SQLSugar VS Code Extension"
    @echo "================================"
    @echo "Description: Edit inline SQL literals with sqls LSP support"
    @echo "Version: $(jq -r .version package.json)"
    @echo "Use 'pnpm run' for development commands"