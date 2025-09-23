import { css } from 'lit';

export const jinja2EditorStyles = css`
  :root {
    /* Layout Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 12px;
    --spacing-lg: 16px;
    --spacing-xl: 24px;
    --spacing-xxl: 32px;

    /* Typography */
    --font-size-xs: 11px;
    --font-size-sm: 12px;
    --font-size-md: 14px;
    --font-size-lg: 16px;
    --font-size-xl: 18px;
    --font-size-xxl: 20px;

    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;

    --line-height-tight: 1.25;
    --line-height-normal: 1.5;
    --line-height-relaxed: 1.75;

    /* Border Radius */
    --border-radius-sm: 4px;
    --border-radius-md: 6px;
    --border-radius-lg: 8px;
    --border-radius-xl: 12px;

    /* Transitions */
    --transition-fast: 150ms ease-in-out;
    --transition-normal: 300ms ease-in-out;
    --transition-slow: 500ms ease-in-out;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);

    /* Colors - Light Theme */
    --jinja-bg-primary: #ffffff;
    --jinja-bg-secondary: #f8f9fa;
    --jinja-bg-tertiary: #e9ecef;
    --jinja-text-primary: #212529;
    --jinja-text-secondary: #6c757d;
    --jinja-text-tertiary: #adb5bd;
    --jinja-border-primary: #dee2e6;
    --jinja-border-secondary: #ced4da;
    --jinja-accent-primary: #0066cc;
    --jinja-accent-secondary: #0052a3;
    --jinja-success: #28a745;
    --jinja-warning: #ffc107;
    --jinja-error: #dc3545;
    --jinja-info: #17a2b8;

    /* Focus Styles */
    --jinja-focus-color: #0066cc;
    --jinja-focus-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
  }

  /* Dark Theme Support */
  @media (prefers-color-scheme: dark) {
    :root {
      --jinja-bg-primary: #1e1e1e;
      --jinja-bg-secondary: #252526;
      --jinja-bg-tertiary: #2d2d2d;
      --jinja-text-primary: #ffffff;
      --jinja-text-secondary: #cccccc;
      --jinja-text-tertiary: #969696;
      --jinja-border-primary: #3e3e42;
      --jinja-border-secondary: #454545;
      --jinja-accent-primary: #0078d4;
      --jinja-accent-secondary: #005a9e;
      --jinja-success: #13a10e;
      --jinja-warning: #e67e22;
      --jinja-error: #e74c3c;
      --jinja-info: #3498db;
    }
  }

  /* Base Styles */
  .jinja-editor {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    color: var(--vscode-foreground, var(--jinja-text-primary));
    background-color: var(--vscode-editor-background, var(--jinja-bg-primary));
    box-sizing: border-box;
  }

  /* Layout Containers */
  .jinja-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

  .jinja-editor-header {
    flex-shrink: 0;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--vscode-widget-border, var(--jinja-border-primary));
    background-color: var(--vscode-editor-background, var(--jinja-bg-primary));
  }

  .jinja-editor-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  .jinja-editor-footer {
    flex-shrink: 0;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-top: 1px solid var(--vscode-widget-border, var(--jinja-border-primary));
    background-color: var(--vscode-editor-background, var(--jinja-bg-secondary));
  }

  /* Typography */
  .jinja-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--vscode-foreground, var(--jinja-text-primary));
    margin: 0;
    padding: 0;
  }

  .jinja-subtitle {
    font-size: var(--font-size-sm);
    color: var(--vscode-descriptionForeground, var(--jinja-text-secondary));
    margin: var(--spacing-xs) 0 0 0;
    padding: 0;
  }

  .jinja-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--vscode-foreground, var(--jinja-text-primary));
    margin: 0 0 var(--spacing-xs) 0;
  }

  .jinja-description {
    font-size: var(--font-size-sm);
    color: var(--vscode-descriptionForeground, var(--jinja-text-secondary));
    line-height: var(--line-height-normal);
    margin: 0;
  }

  /* Panels */
  .jinja-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid var(--vscode-widget-border, var(--jinja-border-primary));
  }

  .jinja-panel:last-child {
    border-right: none;
  }

  .jinja-panel-header {
    flex-shrink: 0;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--vscode-widget-border, var(--jinja-border-primary));
    background-color: var(--vscode-editor-background, var(--jinja-bg-secondary));
  }

  .jinja-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
  }

  /* Form Elements */
  .jinja-form-group {
    margin-bottom: var(--spacing-md);
  }

  .jinja-form-row {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .jinja-form-column {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Buttons */
  .jinja-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--border-radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    text-decoration: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    box-sizing: border-box;
    white-space: nowrap;
    user-select: none;
  }

  .jinja-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .jinja-button-primary {
    background-color: var(--vscode-button-background, var(--jinja-accent-primary));
    color: var(--vscode-button-foreground, white);
  }

  .jinja-button-primary:hover:not(:disabled) {
    background-color: var(--vscode-button-hoverBackground, var(--jinja-accent-secondary));
  }

  .jinja-button-secondary {
    background-color: var(--vscode-button-secondaryBackground, var(--jinja-bg-secondary));
    color: var(--vscode-button-secondaryForeground, var(--jinja-text-primary));
  }

  .jinja-button-secondary:hover:not(:disabled) {
    background-color: var(--vscode-button-secondaryHoverBackground, var(--jinja-bg-tertiary));
  }

  .jinja-button-danger {
    background-color: var(--jinja-error);
    color: white;
  }

  .jinja-button-danger:hover:not(:disabled) {
    background-color: #c82333;
  }

  .jinja-button-sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }

  .jinja-button-lg {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-md);
  }

  /* Input Fields */
  .jinja-input {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--vscode-input-border, var(--jinja-border-primary));
    border-radius: var(--border-radius-md);
    font-size: var(--font-size-sm);
    font-family: inherit;
    line-height: var(--line-height-normal);
    color: var(--vscode-input-foreground, var(--jinja-text-primary));
    background-color: var(--vscode-input-background, var(--jinja-bg-primary));
    box-sizing: border-box;
    transition: border-color var(--transition-fast);
  }

  .jinja-input:focus {
    outline: none;
    border-color: var(--jinja-focus-color);
    box-shadow: var(--jinja-focus-shadow);
  }

  .jinja-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .jinja-input.error {
    border-color: var(--jinja-error);
  }

  /* Select Dropdowns */
  .jinja-select {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--vscode-input-border, var(--jinja-border-primary));
    border-radius: var(--border-radius-md);
    font-size: var(--font-size-sm);
    font-family: inherit;
    line-height: var(--line-height-normal);
    color: var(--vscode-input-foreground, var(--jinja-text-primary));
    background-color: var(--vscode-input-background, var(--jinja-bg-primary));
    cursor: pointer;
    transition: border-color var(--transition-fast);
  }

  .jinja-select:focus {
    outline: none;
    border-color: var(--jinja-focus-color);
    box-shadow: var(--jinja-focus-shadow);
  }

  .jinja-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Status Indicators */
  .jinja-status {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
  }

  .jinja-status-success {
    background-color: var(--jinja-success);
    color: white;
  }

  .jinja-status-warning {
    background-color: var(--jinja-warning);
    color: black;
  }

  .jinja-status-error {
    background-color: var(--jinja-error);
    color: white;
  }

  .jinja-status-info {
    background-color: var(--jinja-info);
    color: white;
  }

  /* Utility Classes */
  .jinja-flex {
    display: flex;
  }

  .jinja-flex-col {
    flex-direction: column;
  }

  .jinja-flex-row {
    flex-direction: row;
  }

  .jinja-items-center {
    align-items: center;
  }

  .jinja-items-start {
    align-items: flex-start;
  }

  .jinja-justify-between {
    justify-content: space-between;
  }

  .jinja-justify-center {
    justify-content: center;
  }

  .jinja-gap-sm {
    gap: var(--spacing-sm);
  }

  .jinja-gap-md {
    gap: var(--spacing-md);
  }

  .jinja-gap-lg {
    gap: var(--spacing-lg);
  }

  .jinja-text-sm {
    font-size: var(--font-size-sm);
  }

  .jinja-text-xs {
    font-size: var(--font-size-xs);
  }

  .jinja-text-muted {
    color: var(--vscode-descriptionForeground, var(--jinja-text-secondary));
  }

  .jinja-text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .jinja-hidden {
    display: none;
  }

  .jinja-block {
    display: block;
  }

  .jinja-inline-block {
    display: inline-block;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .jinja-editor-main {
      flex-direction: column;
    }

    .jinja-panel {
      border-right: none;
      border-bottom: 1px solid var(--vscode-widget-border, var(--jinja-border-primary));
    }

    .jinja-panel:last-child {
      border-bottom: none;
    }

    .jinja-form-row {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  /* Loading States */
  .jinja-loading {
    position: relative;
    pointer-events: none;
    opacity: 0.7;
  }

  .jinja-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: jinja-spin 1s linear infinite;
  }

  @keyframes jinja-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Error Messages */
  .jinja-error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    margin-top: var(--spacing-xs);
    border-radius: var(--border-radius-sm);
    background-color: var(--vscode-errorBackground, rgba(220, 53, 69, 0.1));
    color: var(--vscode-errorForeground, var(--jinja-error));
    font-size: var(--font-size-xs);
  }

  .jinja-error-icon {
    font-size: var(--font-size-md);
  }

  /* Tooltips */
  .jinja-tooltip {
    position: relative;
  }

  .jinja-tooltip-content {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--vscode-editor-background, var(--jinja-bg-primary));
    border: 1px solid var(--vscode-widget-border, var(--jinja-border-primary));
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-xs);
    color: var(--vscode-foreground, var(--jinja-text-primary));
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast);
  }

  .jinja-tooltip:hover .jinja-tooltip-content {
    opacity: 1;
  }

  /* Focus Styles for Accessibility */
  .jinja-focus-ring {
    outline: 2px solid var(--jinja-focus-color);
    outline-offset: 2px;
  }

  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    .jinja-button,
    .jinja-input,
    .jinja-select {
      border: 2px solid currentColor;
    }

    .jinja-focus-ring {
      outline: 3px solid currentColor;
      outline-offset: 1px;
    }
  }
`;