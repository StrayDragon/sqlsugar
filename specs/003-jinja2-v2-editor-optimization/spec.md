# Feature Specification: Jinja2 V2 Editor UX Optimization

## Overview

Optimize the user experience of the Jinja2 V2 editor by implementing variable value memory persistence and enhanced type inference based on contextual analysis.

## User Stories

### Memory Persistence

**As a** Jinja2 template editor user
**I want** the editor to remember variable values I've entered for the same template across editing sessions
**So that** I don't have to re-enter the same values repeatedly, improving my workflow efficiency

### Enhanced Type Inference

**As a** Jinja2 template editor user
**I want** the editor to accurately infer variable types based on both naming patterns and contextual usage
**So that** variables are assigned correct types automatically, reducing manual corrections and improving template accuracy

## Functional Requirements

### Variable Memory Persistence

1. **Template Fingerprinting**: Create unique identifiers for Jinja2 templates to recognize when the same template is being edited again
2. **Value Storage**: Persist variable values in a local storage mechanism keyed by template fingerprint
3. **Auto-population**: Automatically populate variable input fields with previously used values when the same template is re-opened
4. **Value Versioning**: Maintain history of values for variables that change frequently

### Enhanced Type Inference

1. **Naming Pattern Analysis**: Enhance existing name-based type inference with expanded patterns
2. **Contextual Analysis**: Analyze Jinja2 control structures to infer variable types:
   - `{% if variable %}` → boolean type inference
   - `{% for item in variable %}` → array/list type inference
   - `{% set variable = 123 %}` → numeric type inference
   - `{% set variable = "text" %}` → string type inference
3. **Usage Pattern Detection**: Analyze how variables are used within the template to refine type inference
4. **Confidence Scoring**: Provide confidence levels for inferred types to allow user override when needed

### User Interface Improvements

1. **Memory Indicators**: Visual indicators showing which variables have remembered values
2. **Type Confidence Display**: Visual feedback on type inference confidence
3. **Manual Override**: Easy mechanism for users to correct inferred types
4. **Value History**: Access to previously used values for variables

## Technical Requirements

### Storage Mechanism

- Use VS Code's extension context globalState for persistence
- Implement template fingerprinting algorithm (content hash + structure analysis)
- Handle data serialization/deserialization for different variable types
- Implement cleanup strategies for old/unused template data

### Type Inference Engine

- Extend existing variable inference in `src/features/jinja2/`
- Implement AST parsing for Jinja2 templates
- Create rule-based inference system
- Add confidence scoring algorithm

### UI Integration

- Update existing Lit components in `src/features/jinja2/ui/`
- Add memory persistence indicators to variable popover
- Enhance type display with confidence levels
- Implement value history dropdown

## Non-Functional Requirements

### Performance

- Template fingerprinting should complete within 100ms for typical templates
- Type inference should not block UI responsiveness
- Storage operations should be asynchronous

### Compatibility

- Must work with existing Jinja2 V2 editor architecture
- Maintain backward compatibility with current variable system
- Support all existing variable types and validation

### Privacy

- All data stored locally in user's VS Code environment
- No external data transmission for template/value storage
- Clear data management options for users

## Acceptance Criteria

### Memory Persistence

- [ ] Same template reopened within 24 hours shows all previous variable values
- [ ] Template modifications (minor changes) preserve variable value memory
- [ ] Users can clear remembered values for specific variables
- [ ] Performance impact is negligible (< 50ms additional load time)

### Enhanced Type Inference

- [ ] Boolean inference accuracy > 90% for `{% if %}` contexts
- [ ] Array/list inference accuracy > 85% for `{% for %}` contexts
- [ ] String/numeric inference from literal assignments > 95% accuracy
- [ ] Users can easily override inferred types with manual selection
- [ ] Confidence scores accurately reflect inference reliability

### User Experience

- [ ] Visual indicators clearly show remembered vs new values
- [ ] Type inference confidence is visually communicated
- [ ] Manual type correction workflow is intuitive
- [ ] No regression in existing V2 editor functionality

## Out of Scope

- Cloud synchronization of variable values across devices
- Machine learning-based type prediction
- Template sharing or collaboration features
- Automatic variable value generation/suggestions

## Dependencies

- Existing Jinja2 V2 editor UI components
- VS Code Extension API for persistent storage
- Nunjucks template engine integration
- Current variable inference system

## Risks and Mitigations

**Risk**: Template fingerprinting false positives (different templates with same fingerprint)
- **Mitigation**: Use robust hashing algorithm including structure analysis

**Risk**: Performance degradation with large templates
- **Mitigation**: Implement incremental analysis and caching

**Risk**: Type inference conflicts with user expectations
- **Mitigation**: Provide clear manual override options and confidence indicators

**Risk**: Storage bloat over time with many templates
- **Mitigation**: Implement automatic cleanup and size limits