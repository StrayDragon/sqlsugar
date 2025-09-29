// Core UI Components
export { JinjaButton } from './components/ui/button.js';
export { JinjaInput } from './components/ui/input.js';
export { JinjaSelect } from './components/ui/select.js';

// Specialized Components
export { JinjaVariableInput } from './components/variable-input.js';
export { JinjaSqlPreview } from './components/sql-preview.js';

// Main Editor Component
export { Jinja2Editor } from './components/jinja2-editor.js';

// Types are exported separately via declaration files

// Re-export Lit for convenience
export * from 'lit';
export { customElement, property, state, query } from 'lit/decorators.js';
export { html, css, nothing } from 'lit';
export { classMap } from 'lit/directives/class-map.js';
export { styleMap } from 'lit/directives/style-map.js';
export { repeat } from 'lit/directives/repeat.js';
export { map } from 'lit/directives/map.js';

// Utility functions
export { createJinja2Variable, isJinja2Variable, validateJinja2Variable } from './utils/variable-utils.js';

// CSS Variables and Theming
export { jinja2EditorStyles } from './styles/editor-styles.js';

// Version
export const version = '1.0.0';
