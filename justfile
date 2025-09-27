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

# Run linting (all files)
lint:
    pnpm run lint

# Run linting on main extension files only
lint-main:
    pnpm run lint:main

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
    @mkdir -p backups
    @cp sqlsugar.vsix "backups/sqlsugar-$(date +%Y%m%d-%H%M%S).vsix"
    @echo "✅ Backup created in backups/ directory"

# =============================================================================
# Cleanup Commands
# =============================================================================

# Clean up generated files
clean:
    rm -rf dist/
    rm -rf out/
    rm -f *.vsix

# =============================================================================
# Aliases and Shortcuts
# =============================================================================

# Common aliases
alias pv := package-vsix
alias c := clean
alias lm := lint-main
alias bd := build-declarations

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