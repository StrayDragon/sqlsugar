# SQLSugar VS Code Extension - Justfile
# Simplified task runner for packaging, testing, and cleanup

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

# Run linting
lint:
    pnpm run lint

# =============================================================================
# Testing Commands
# =============================================================================

# Run unit tests (fast)
unit-test:
    @echo "🧪 Running unit tests..."
    pnpm run lint
    pnpm run check-types
    @echo "✅ Unit tests completed successfully!"

# Run integration tests (with VS Code)
integration-test: compile-tests build
    @echo "🧪 Running integration tests..."
    # Use xvfb-run if available (for CI), otherwise run directly (for local dev)
    @if command -v xvfb-run >/dev/null 2>&1; then \
        DISPLAY=':99.0' xvfb-run -a pnpm run test; \
    else \
        pnpm run test; \
    fi
    # Clean up temporary files
    rm -rf .vscode-test/
    rm -rf artifacts/test_stub/
    @echo "✅ Integration tests completed successfully!"

# Compile test files
compile-tests:
    pnpm run compile-tests

# =============================================================================
# MySQL Database Testing (Optional)
# ==============================================================================

# Setup MySQL database for testing using Docker Compose
setup-db:
    @echo "🗄️ Setting up test database using Docker Compose..."
    # Check if Docker is running
    @docker info > /dev/null 2>&1 || (echo "❌ Docker is not running" && exit 1)
    # Start MySQL using docker-compose
    cd docker && docker-compose up -d
    # Wait for MySQL to be ready
    @echo "⏳ Waiting for MySQL to be ready..."
    @until mysql -h 127.0.0.1 -u testuser -ptestpass -e "SELECT 1" 2>/dev/null; do \
        echo "Waiting for MySQL..."; \
        sleep 2; \
    done
    @echo "✅ Database setup complete"

# Cleanup test database container
clean-db:
    @echo "🧹 Cleaning up test database..."
    cd docker && docker-compose down
    @echo "✅ Database cleanup complete"

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
    rm -rf .vscode-test/
    rm -rf artifacts/test_stub/

# =============================================================================
# Aliases and Shortcuts
# =============================================================================

# Common aliases
alias pv := package-vsix
alias c := clean

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
