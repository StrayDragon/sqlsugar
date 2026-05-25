# SQLSugar VS Code Extension - Justfile

# Default recipe - show available commands
default:
    @just --list

# =============================================================================
# Development Commands
# =============================================================================

# Install dependencies
install:
    pnpm install --frozen-lockfile

# Build the extension
build:
    pnpm run compile

# Run type checking
type-check:
    pnpm run check-types

# Build type declarations
build-declarations:
    pnpm run build:declarations

# Fix lint issues automatically
lint-fix:
    pnpm run lint:fix

# Run linting on all files (including jinja2-editor)
lint:
    pnpm run check-types
    pnpm run lint

# =============================================================================
# Quality Assurance
# =============================================================================

# Run unit tests
test:
    pnpm run test

# Run tests with coverage report
test-coverage:
    pnpm run test:coverage

# Run tests in watch mode (development)
test-watch:
    pnpm run test:watch

# Run tests with Vitest UI
test-ui:
    pnpm run test:ui

# Validate llmanspec specs and changes
spec-validate:
    llman sdd validate --all --no-interactive

# Check spec staleness
spec-check:
    #!/usr/bin/env bash
    set -e
    STALE=$(llman sdd validate --specs --no-interactive 2>&1 | grep -c "STALE" || true)
    echo "Stale specs: $STALE"
    if [ "$STALE" -gt 0 ]; then
      echo "⚠️  Some specs may need updating"
    else
      echo "✅ All specs up to date"
    fi

# Full QA pipeline (local equivalent of CI)
qa: lint test-coverage spec-validate
    @echo "✅ All QA checks passed"

# Quick pre-commit check (fast feedback)
pre-commit: type-check test
    @echo "✅ Ready to commit"

# Simulate full CI locally
ci-local: lint test-coverage spec-validate build
    @echo "✅ CI simulation complete"

# =============================================================================
# Code Hygiene
# =============================================================================

# Clean unnecessary // line comments in src/ (keep /* ... */ and essential directives)
after-ai-write-remove-comments:
    node scripts/clean-comment.js src

# =============================================================================
# Packaging and Distribution
# =============================================================================

# Package as .vsix file for distribution
package-vsix:
    pnpm run vsix

# Install the extension locally for testing
install-vsix: package-vsix
    code --install-extension sqlsugar.vsix --force

# Create backup of current vsix
backup: package-vsix
    #!/usr/bin/env bash
    set -e
    mkdir -p backups
    cp sqlsugar.vsix "backups/sqlsugar-$(date +%Y%m%d-%H%M%S).vsix"
    echo "✅ Backup created in backups/ directory"

# Clean up generated files
clean:
    rm -rf dist/
    rm -rf out/
    rm -f *.vsix
