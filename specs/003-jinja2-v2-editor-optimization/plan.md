# Implementation Plan: Jinja2 V2 Editor UX Optimization

**Branch**: `003-jinja2-v2-editor-optimization` | **Date**: 2025-01-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-jinja2-v2-editor-optimization/spec.md`

## Summary

Optimize the Jinja2 V2 editor user experience by implementing variable value memory persistence and enhanced type inference based on contextual template analysis. The solution uses VS Code's globalState for persistent storage, multi-layered template fingerprinting for value matching, and constraint-based type inference leveraging existing Nunjucks AST parsing capabilities.

## Technical Context

**Language/Version**: TypeScript 5.0+ (ES2022 target, CommonJS modules)
**Primary Dependencies**: VS Code Extension API, Nunjucks 3.2.4, Lit 2.x, esbuild
**Storage**: VS Code ExtensionContext.globalState (5MB limit) with workspaceState fallback
**Testing**: Vitest with jsdom environment, VS Code API mocking
**Target Platform**: VS Code Extension (cross-platform)
**Project Type**: VS Code Extension with WebView components
**Performance Goals**: Template fingerprinting <100ms, storage operations <50ms, UI responsiveness maintained
**Constraints**: <200ms additional load time, <5MB storage quota, offline-capable, backward compatible
**Scale/Scope**: Single extension with ~50K users, handles typical Jinja2 templates (<10K chars)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Project Constitution Alignment

**Core Principles Applied**:
- **Test-First**: TDD mandatory for all new components (VariableMemoryService, enhanced inference)
- **Integration Testing**: Focus on new storage contracts and webview message protocols
- **Library-First**: Variable memory system designed as standalone service
- **CLI Interface**: Not applicable (VS Code extension context)
- **Observability**: Comprehensive logging for debugging memory and inference operations

**All Gates Passed** ✓
- No architectural violations identified
- Existing SQLSugar architecture maintained
- New features follow established patterns
- Performance and compatibility constraints respected

## Project Structure

### Documentation (this feature)

```text
specs/003-jinja2-v2-editor-optimization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Research findings and decisions
├── data-model.md        # Phase 1 output - Entity definitions and relationships
├── quickstart.md        # Phase 1 output - Developer implementation guide
├── contracts/           # Phase 1 output - API specifications
│   ├── variable-memory-api.yaml
│   └── webview-messages.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Single project extension - enhancing existing SQLSugar architecture

```text
src/
├── features/jinja2/
│   ├── processor.ts              # Enhanced with template fingerprinting
│   ├── webview.ts                # Enhanced with new message handlers
│   ├── command-handler.ts        # Enhanced with memory coordination
│   └── ui/
│       ├── components/
│       │   ├── jinja2-editor-v2.ts      # Enhanced with memory indicators
│       │   ├── sql-preview-v2.ts        # Enhanced with confidence display
│       │   └── variable-popover.ts      # Enhanced with inference details
│       └── utils/
│           ├── variable-state-manager.ts  # Enhanced with memory persistence
│           ├── variable-utils.ts          # Enhanced with contextual inference
│           ├── template-parser.ts         # Enhanced with control structure analysis
│           └── variable-memory-service.ts # NEW: Memory management service
└── tests/
    ├── unit/
    │   ├── features/
    │   │   └── jinja2/
    │   │       ├── variable-memory-service.test.ts
    │   │       ├── enhanced-type-inference.test.ts
    │   │       └── template-fingerprinting.test.ts
    │   └── ui/
    │       └── components/
    │           ├── variable-popover.test.ts
    │           └── jinja2-editor-v2.test.ts
    └── integration/
        ├── jinja2-memory-persistence.test.ts
        └── webview-message-protocol.test.ts
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No Constitution Violations** - All complexity is justified and follows established patterns.

| Feature | Complexity Rationale | Simpler Alternative Rejected Because |
|---------|---------------------|--------------------------------------|
| Template Fingerprinting (SHA-256 + structure analysis) | Provides robust template identification while allowing minor modifications, essential for reliable value matching | Simple content hash rejected because any template change would break memory association |
| Constraint-based Type Inference | Leverages existing Nunjucks AST parsing for powerful contextual analysis with minimal performance impact | Regex-only inference rejected because it cannot understand template control flow and context |
| Multi-layered Storage (globalState + workspaceState fallback) | Ensures data persistence across different workspace configurations and handles storage failures gracefully | Single storage method rejected because it lacks reliability and cross-workspace functionality |
| Enhanced Variable State Manager | Maintains existing sophisticated variable management while adding persistence, preserves all current functionality | Separate memory system rejected because it would duplicate state management and create synchronization issues |
