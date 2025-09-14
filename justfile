# SQLSugar VS Code Extension - Justfile
# Simplified task runner for packaging and cleanup

# Default recipe - show available commands
default:
    @just --list

# ==============================================================================
# Packaging and Distribution
# ==============================================================================

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

# ==============================================================================
# Cleanup Commands
# ==============================================================================

# Clean up generated files
clean:
    rm -rf dist/
    rm -rf out/
    rm -f *.vsix
    rm -f debug/*.pyc
    rm -rf debug/__pycache__/
    rm -rf .vscode-test/

# Deep clean (removes node_modules too)
deep-clean: clean
    rm -rf node_modules/

# ==============================================================================
# Aliases and Shortcuts
# ==============================================================================

# Common aliases
alias pv := package-vsix
alias c := clean
alias dc := deep-clean

# ==============================================================================
# Help and Information
# ==============================================================================

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