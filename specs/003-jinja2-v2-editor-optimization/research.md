# Research Findings: Jinja2 V2 Editor UX Optimization

## Template Fingerprinting and Variable Memory Persistence

### Decision: Multi-layered template fingerprinting approach
**Rationale**: The SQLSugar codebase already has sophisticated template parsing capabilities via the Jinja2NunjucksProcessor. A multi-layered approach using structure hash, variable names, and content hash provides robust template identification while allowing for minor template modifications.

**Implementation**: Use SHA-256 for structure hashing combined with variable name sorting and metadata.

### Storage Mechanism: VS Code globalState with workspace fallback
**Rationale**: VS Code's ExtensionContext.globalState provides cross-workspace synchronization, automatic backup, and 5MB storage limit which is sufficient for variable memory. WorkspaceState fallback ensures data persistence even if global storage fails.

**Alternatives considered**:
- File system storage (more complex, requires manual cleanup)
- SecretStorage (overkill for non-sensitive data)
- Database (unnecessary complexity)

## Enhanced Type Inference Engine

### Decision: Constraint-based type inference using existing Nunjucks AST parsing
**Rationale**: The current implementation already uses Nunjucks parser for variable extraction. Extending this for contextual analysis (if conditions, for loops, set assignments) leverages existing infrastructure while providing powerful inference capabilities.

**Implementation Strategy**:
1. Deep AST traversal for control structure analysis
2. Type constraint extraction and propagation
3. Confidence scoring based on context strength

### Contextual Analysis Rules

#### Boolean Inference from Control Structures
- `{% if variable %}` → boolean type (90%+ confidence)
- `{% elif variable %}` → boolean type (85%+ confidence)
- `{% if not variable %}` → boolean type (90%+ confidence)

#### Array/List Inference from Loops
- `{% for item in collection %}` → collection is array type (85%+ confidence)
- Loop iterators become object types based on usage patterns

#### Type Inference from Assignments
- `{% set variable = "literal" %}` → string type (95%+ confidence)
- `{% set variable = 123 %}` → number type (95%+ confidence)
- `{% set variable = true %}` → boolean type (95%+ confidence)

## Integration Architecture

### Decision: Extend existing VariableStateManager with persistence layer
**Rationale**: The current VariableStateManager already provides comprehensive variable state management, history tracking, and validation. Adding persistence as an additional layer maintains architectural consistency and minimizes disruption.

**Implementation Points**:
1. Add memory persistence methods to VariableStateManager
2. Enhance VariableContext interface with inference confidence
3. Update UI components to display memory and confidence indicators

### WebView Communication Enhancement
**Decision**: Extend existing message passing protocol with new message types
**Rationale**: The current webview communication is well-established. Adding new message types for memory operations and inference updates follows existing patterns.

## Performance Considerations

### Debounced Storage Operations
**Rationale**: VS Code storage operations are fast but should be debounced to prevent excessive writes during rapid user input.

### Memory-efficient Caching
**Rationale**: LRU cache for frequently accessed templates and variables prevents memory bloat while maintaining performance.

## Testing Strategy

### Unit Testing Focus
- Template fingerprinting accuracy
- Type inference confidence scoring
- Storage serialization/deserialization
- Variable state management integration

### Integration Testing Focus
- End-to-end variable value persistence
- WebView message passing with new types
- Complex template analysis scenarios
- Performance under load

## Configuration Strategy

### User Control Over Features
**Rationale**: Users should control memory retention, inference confidence thresholds, and visual indicators through VS Code settings.

### Default Settings Philosophy
**Rationale**: Enable features by default but provide granular control for power users and privacy-conscious users.

## Migration and Backward Compatibility

### Gradual Feature Rollout
**Rationale**: New features should not disrupt existing workflows. Memory persistence and enhanced inference can be introduced incrementally.

### Data Format Versioning
**Rationale**: Implement storage schema versioning to handle future format changes without data loss.

## Security and Privacy

### Local Storage Only
**Rationale**: All variable values stored locally in user's VS Code environment. No external data transmission.

### Optional Cross-machine Sync
**Rationale**: Users can opt-in to VS Code's built-in synchronization for cross-device consistency.