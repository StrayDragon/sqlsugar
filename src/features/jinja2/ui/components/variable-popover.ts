/**
 * Variable Popover Component for V2 Editor
 *
 * Provides an inline editor for template variables with smart positioning
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type {
  EnhancedVariable,
  PopoverPosition,
  VariableChangeEventV2,
  EditorV2Config,
  Jinja2VariableValue,
  Jinja2VariableType
} from '../types.js';
import type { VariableMemory, RememberedValue } from '../types/memory.js';
import type { TypeInferenceResult } from '../types/enhanced-variable.js';
import { getDefaultValueForType, validateValue } from '../utils/variable-utils.js';
import {
  calculatePopoverPosition,
  getArrowPosition,
  animatePositionChange,
  shouldReposition,
  adjustPositionForScroll
} from '../utils/position-calculator.js';


import './ui/input.js';
import './ui/select.js';
import './ui/button.js';


const POPOVER_DIMENSIONS = {
  width: 320,
  height: 280,
  arrowSize: 8
};

@customElement('variable-popover')
export class VariablePopover extends LitElement {
  @property({ attribute: false }) accessor variable: EnhancedVariable | null = null;
  @property({ attribute: false }) accessor config: EditorV2Config = {
    enabled: true,
    popoverPlacement: 'auto',
    highlightStyle: 'background',
    autoPreview: true,
    keyboardNavigation: true,
    animationsEnabled: true,
    showSuggestions: true,
    autoFocusFirst: false
  };
  @property({ type: String }) accessor theme: string = 'vscode-dark';
  @property({ attribute: false }) accessor currentValue: Jinja2VariableValue = undefined;
  @property({ attribute: false }) accessor targetElement: HTMLElement | null = null;
  @property({ attribute: false }) accessor containerElement: HTMLElement | null = null;
  @property({ attribute: false }) accessor rememberedValues: RememberedValue[] = [];
  @property({ type: Boolean }) accessor memoryEnabled: boolean = true;
  @property({ attribute: false }) accessor templateFingerprint: string = '';
  @property({ attribute: false }) accessor typeInference: TypeInferenceResult | null = null;
  @property({ type: Boolean }) accessor showTypeInference: boolean = true;

  @state() accessor isVisible: boolean = false;
  @state() accessor position: PopoverPosition | null = null;
  @state() accessor localValue: Jinja2VariableValue = undefined;
  @state() accessor localType: Jinja2VariableType = 'string';
  @state() accessor showAdvancedOptions: boolean = false;
  @state() accessor isAnimating: boolean = false;
  @state() accessor showMemorySection: boolean = true;
  @state() accessor showTypeSection: boolean = true;


  private quickSuggestions = {
    string: {
      'id': ['1', '123', 'user_id', 'sample_id'],
      'name': ['John Doe', 'Sample Name', 'Test User'],
      'email': ['test@example.com', 'user@domain.com', 'admin@test.org'],
      'default': ['sample', 'test', 'demo', 'example']
    },
    number: {
      'id': [1, 123, 1000],
      'count': [10, 25, 100],
      'limit': [10, 50, 100],
      'default': [0, 1, 42, 100]
    },
    boolean: {
      'is_': [true, false],
      'has_': [true, false],
      'can_': [true, false],
      'default': [true, false]
    },
    date: {
      'created': ['2024-01-01', '2024-12-31', new Date().toISOString().split('T')[0]],
      'updated': ['2024-01-01', '2024-12-31', new Date().toISOString().split('T')[0]],
      'default': ['2024-01-01', new Date().toISOString().split('T')[0]]
    }
  };

  // @ts-ignore - Lit static styles don't need override
  static override styles = css`
    :host {
      position: absolute;
      z-index: 1000;
      display: none;
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      font-size: var(--font-size-sm, 12px);
    }

    :host([visible]) {
      display: block;
    }

    .popover-container {
      background: var(--vscode-editorHoverWidget-background);
      border: 1px solid var(--vscode-editorHoverWidget-border);
      border-radius: var(--border-radius-md, 6px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      min-width: 280px;
      max-width: 400px;
      position: relative;
      opacity: 0;
      transform: translateY(-5px) scale(0.95);
      transition: all var(--transition-normal, 0.2s ease);
      pointer-events: none;
    }

    .popover-container.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .popover-container.animating {
      transition: all var(--transition-slow, 0.3s ease);
    }

    /* Arrow */
    .popover-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: ${POPOVER_DIMENSIONS.arrowSize}px;
      border-color: transparent;
    }

    .popover-arrow::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: ${POPOVER_DIMENSIONS.arrowSize}px;
      border-color: transparent;
    }

    .popover-arrow.top {
      bottom: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-top-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.top::before {
      top: -${POPOVER_DIMENSIONS.arrowSize + 1}px;
      border-top-color: var(--vscode-editorHoverWidget-background);
    }

    .popover-arrow.bottom {
      top: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-bottom-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.bottom::before {
      top: 1px;
      border-bottom-color: var(--vscode-editorHoverWidget-background);
    }

    .popover-arrow.left {
      right: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-left-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.left::before {
      left: -${POPOVER_DIMENSIONS.arrowSize + 1}px;
      border-left-color: var(--vscode-editorHoverWidget-background);
    }

    .popover-arrow.right {
      left: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-right-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.right::before {
      left: 1px;
      border-right-color: var(--vscode-editorHoverWidget-background);
    }

    /* Header */
    .popover-header {
      padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
      border-bottom: 1px solid var(--vscode-editorHoverWidget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-md, 6px) var(--border-radius-md, 6px) 0 0;
    }

    .variable-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .variable-name {
      font-weight: var(--font-weight-semibold, 600);
      color: var(--vscode-foreground);
      font-size: var(--font-size-md, 13px);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .variable-type {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .required-badge {
      background: var(--vscode-errorForeground);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-icon-foreground);
      cursor: pointer;
      padding: 4px;
      border-radius: 3px;
      transition: all var(--transition-fast, 0.15s ease);
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }

    /* Content */
    .popover-content {
      padding: var(--spacing-lg, 16px);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 12px);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 4px);
    }

    .form-label {
      font-weight: var(--font-weight-medium, 500);
      color: var(--vscode-foreground);
      font-size: var(--font-size-xs, 11px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .form-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--spacing-sm, 8px);
      align-items: center;
    }

    /* Quick suggestions */
    .quick-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: var(--spacing-xs, 4px);
    }

    .suggestion-chip {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-widget-border);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: var(--font-size-xs, 11px);
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      white-space: nowrap;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-chip:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
    }

    .suggestion-chip.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
    }

    /* Advanced options */
    .advanced-options {
      border-top: 1px solid var(--vscode-widget-border);
      padding-top: var(--spacing-md, 12px);
      margin-top: var(--spacing-md, 12px);
    }

    .advanced-toggle {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      font-size: var(--font-size-xs, 11px);
      padding: 4px 0;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all var(--transition-fast, 0.15s ease);
    }

    .advanced-toggle:hover {
      color: var(--vscode-textLink-activeForeground);
    }

    .advanced-content {
      display: none;
      margin-top: var(--spacing-sm, 8px);
      padding: var(--spacing-sm, 8px);
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
    }

    .advanced-content.visible {
      display: block;
    }

    /* Context information */
    .context-info {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      padding: var(--spacing-sm, 8px);
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
      border-left: 3px solid var(--vscode-textLink-foreground);
    }

    .context-label {
      font-weight: var(--font-weight-medium, 500);
      margin-bottom: 2px;
    }

    .context-value {
      word-break: break-word;
    }

    /* Actions */
    .popover-actions {
      padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
      border-top: 1px solid var(--vscode-editorHoverWidget-border);
      display: flex;
      gap: var(--spacing-sm, 8px);
      justify-content: flex-end;
      background: var(--vscode-textBlockQuote-background);
      border-radius: 0 0 var(--border-radius-md, 6px) var(--border-radius-md, 6px);
    }

    .action-button {
      padding: 6px 12px;
      border-radius: var(--border-radius-sm, 4px);
      font-size: var(--font-size-xs, 11px);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      border: 1px solid;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-border);
    }

    .action-button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .action-button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-color: var(--vscode-button-secondaryBorder);
    }

    .action-button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    /* Memory Section */
    .memory-section {
      border-top: 1px solid var(--vscode-widget-border);
      padding: var(--spacing-md, 12px) 0;
      margin-top: var(--spacing-md, 12px);
    }

    .memory-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs, 4px);
      margin-bottom: var(--spacing-sm, 8px);
      font-size: var(--font-size-xs, 11px);
      font-weight: var(--font-weight-medium, 500);
      color: var(--vscode-foreground);
      cursor: pointer;
      user-select: none;
    }

    .memory-header:hover {
      color: var(--vscode-textLink-foreground);
    }

    .memory-toggle {
      transition: transform var(--transition-fast, 0.15s ease);
    }

    .memory-toggle.collapsed {
      transform: rotate(-90deg);
    }

    .memory-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm, 8px);
    }

    .memory-content.collapsed {
      display: none;
    }

    .remembered-values {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs, 4px);
    }

    .remembered-value {
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-widget-border);
      padding: 4px 8px;
      border-radius: var(--border-radius-sm, 4px);
      font-size: var(--font-size-xs, 11px);
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .remembered-value:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
    }

    .remembered-value.selected {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
    }

    .remembered-value .confidence-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .remembered-value .confidence-indicator.high {
      background: var(--vscode-charts-green);
    }

    .remembered-value .confidence-indicator.medium {
      background: var(--vscode-charts-orange);
    }

    .remembered-value .confidence-indicator.low {
      background: var(--vscode-charts-red);
    }

    .remembered-value .value-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .remembered-value .usage-count {
      font-size: 9px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-widget-background);
      padding: 1px 4px;
      border-radius: 8px;
      margin-left: auto;
    }

    .remembered-value .remove-memory {
      opacity: 0;
      background: var(--vscode-errorForeground);
      color: white;
      border: none;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      font-size: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity var(--transition-fast, 0.15s ease);
    }

    .remembered-value:hover .remove-memory {
      opacity: 1;
    }

    .remembered-value .remove-memory:hover {
      background: var(--vscode-button-background);
    }

    .memory-stats {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      padding: var(--spacing-sm, 8px);
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
      border-left: 3px solid var(--vscode-textLink-foreground);
    }

    .memory-empty {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      padding: var(--spacing-sm, 8px);
      font-style: italic;
      text-align: center;
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
      border: 1px dashed var(--vscode-widget-border);
    }

    /* Type Inference Section */
    .type-inference-section {
      border-top: 1px solid var(--vscode-widget-border);
      padding: var(--spacing-md, 12px) 0;
      margin-top: var(--spacing-md, 12px);
    }

    .type-inference-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs, 4px);
      margin-bottom: var(--spacing-sm, 8px);
      font-size: var(--font-size-xs, 11px);
      font-weight: var(--font-weight-medium, 500);
      color: var(--vscode-foreground);
      cursor: pointer;
      user-select: none;
    }

    .type-inference-header:hover {
      color: var(--vscode-textLink-foreground);
    }

    .type-inference-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm, 8px);
    }

    .type-inference-content.collapsed {
      display: none;
    }

    .confidence-bar {
      height: 4px;
      background: var(--vscode-widget-background);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: var(--spacing-xs, 4px);
    }

    .confidence-fill {
      height: 100%;
      border-radius: 2px;
      transition: width var(--transition-normal, 0.2s ease);
    }

    .confidence-fill.high {
      background: var(--vscode-charts-green);
      width: var(--confidence-percent, 90%);
    }

    .confidence-fill.medium {
      background: var(--vscode-charts-orange);
      width: var(--confidence-percent, 60%);
    }

    .confidence-fill.low {
      background: var(--vscode-charts-red);
      width: var(--confidence-percent, 30%);
    }

    .confidence-fill.very-low {
      background: var(--vscode-descriptionForeground);
      width: var(--confidence-percent, 10%);
    }

    .inference-details {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      padding: var(--spacing-sm, 8px);
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
      border-left: 3px solid;
    }

    .inference-details.high-confidence {
      border-left-color: var(--vscode-charts-green);
    }

    .inference-details.medium-confidence {
      border-left-color: var(--vscode-charts-orange);
    }

    .inference-details.low-confidence {
      border-left-color: var(--vscode-charts-red);
    }

    .inference-details.very-low-confidence {
      border-left-color: var(--vscode-descriptionForeground);
    }

    .confidence-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-xs, 4px);
      font-size: var(--font-size-xs, 11px);
    }

    .confidence-value {
      font-weight: var(--font-weight-semibold, 600);
    }

    .confidence-value.high {
      color: var(--vscode-charts-green);
    }

    .confidence-value.medium {
      color: var(--vscode-charts-orange);
    }

    .confidence-value.low {
      color: var(--vscode-charts-red);
    }

    .confidence-value.very-low {
      color: var(--vscode-descriptionForeground);
    }

    .inference-reasons {
      margin-top: var(--spacing-xs, 4px);
    }

    .inference-reason {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-xs, 4px);
      margin-bottom: var(--spacing-xs, 2px);
      font-size: var(--font-size-xs, 10px);
      line-height: 1.3;
    }

    .inference-reason-bullet {
      color: var(--vscode-textLink-foreground);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .inference-alternatives {
      margin-top: var(--spacing-sm, 8px);
    }

    .alternative-types {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs, 4px);
      margin-top: var(--spacing-xs, 4px);
    }

    .alternative-type {
      background: var(--vscode-button-secondaryBackground);
      border: 1px solid var(--vscode-widget-border);
      padding: 2px 6px;
      border-radius: var(--border-radius-sm, 4px);
      font-size: var(--font-size-xs, 10px);
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .alternative-type:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
    }

    .alternative-confidence {
      font-size: 9px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-widget-background);
      padding: 1px 3px;
      border-radius: 6px;
    }

    /* Type suggestions for manual override */
    .type-suggestions {
      margin-top: var(--spacing-sm, 8px);
    }

    .type-suggestion-label {
      font-size: var(--font-size-xs, 10px);
      color: var(--vscode-descriptionForeground);
      margin-bottom: var(--spacing-xs, 4px);
      font-style: italic;
    }

    /* Validation */
    .validation-message {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-errorForeground);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: var(--spacing-xs, 4px);
    }

    .validation-message.valid {
      color: var(--vscode-charts-green);
    }

    /* Animations */
    @keyframes popover-appear {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes popover-disappear {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
    }

    .popover-container.appearing {
      animation: popover-appear var(--transition-normal, 0.2s ease) forwards;
    }

    .popover-container.disappearing {
      animation: popover-disappear var(--transition-normal, 0.2s ease) forwards;
    }

    /* Dark theme adjustments */
    :host([theme="dark"]) {
      --vscode-editorHoverWidget-background: #2d2d30;
      --vscode-editorHoverWidget-border: #3e3e42;
      --vscode-textBlockQuote-background: #1e1e1e;
    }

    /* Light theme adjustments */
    :host([theme="light"]) {
      --vscode-editorHoverWidget-background: #f3f3f3;
      --vscode-editorHoverWidget-border: #c8c8c8;
      --vscode-textBlockQuote-background: #ffffff;
    }
  `;

  override willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('variable') || changedProperties.has('currentValue')) {
      this.updateLocalValues();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setupGlobalListeners();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeGlobalListeners();
  }

  private setupGlobalListeners() {
    document.addEventListener('keydown', this.handleGlobalKeyDown);
    document.addEventListener('click', this.handleGlobalClick);
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleResize);
  }

  private removeGlobalListeners() {
    document.removeEventListener('keydown', this.handleGlobalKeyDown);
    document.removeEventListener('click', this.handleGlobalClick);
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (!this.isVisible) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.applyChanges();
    }
  };

  private handleGlobalClick = (event: MouseEvent) => {
    if (!this.isVisible) return;

    const target = event.target as Element;
    if (!this.contains(target)) {
      // Check if click is on the target element
      if (this.targetElement && !this.targetElement.contains(target)) {
        this.hide();
      }
    }
  };

  private handleScroll = () => {
    if (!this.isVisible || !this.targetElement || !this.containerElement) return;

    if (shouldReposition(this.position!, this.targetElement, this.containerElement)) {
      this.reposition();
    }
  };

  private handleResize = () => {
    if (!this.isVisible || !this.targetElement || !this.containerElement) return;
    this.reposition();
  };

  private updateLocalValues() {
    if (!this.variable) return;

    this.localValue = this.currentValue ?? this.variable.defaultValue ?? getDefaultValueForType(this.variable.type);
    this.localType = this.variable.type;
  }

  private toggleMemorySection() {
    this.showMemorySection = !this.showMemorySection;
  }

  private handleRememberedValueClick(rememberedValue: RememberedValue) {
    this.localValue = rememberedValue.value;
    this.localType = rememberedValue.type || this.variable!.type;

    // Dispatch event to notify parent component
    this.dispatchEvent(new CustomEvent('memory-value-selected', {
      detail: {
        variable: this.variable!,
        rememberedValue,
        autoSave: true
      },
      bubbles: true,
      composed: true
    }));
  }

  private removeRememberedValue(event: MouseEvent, rememberedValue: RememberedValue) {
    event.stopPropagation();

    this.dispatchEvent(new CustomEvent('memory-value-removed', {
      detail: {
        variable: this.variable!,
        rememberedValue
      },
      bubbles: true,
      composed: true
    }));
  }

  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  private formatRememberedValue(value: Jinja2VariableValue): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private isRememberedValueSelected(rememberedValue: RememberedValue): boolean {
    if (typeof this.localValue === 'number' && typeof rememberedValue.value === 'number') {
      return this.localValue === rememberedValue.value;
    }
    return String(this.localValue) === String(rememberedValue.value);
  }

  private getMostUsedValue(): string {
    if (this.rememberedValues.length === 0) return '';

    const mostUsed = this.rememberedValues.reduce((prev, current) =>
      prev.usageCount > current.usageCount ? prev : current
    );

    return this.formatRememberedValue(mostUsed.value);
  }

  private getAverageConfidence(): number {
    if (this.rememberedValues.length === 0) return 0;

    const totalConfidence = this.rememberedValues.reduce((sum, value) => sum + value.confidence, 0);
    return totalConfidence / this.rememberedValues.length;
  }

  private toggleTypeSection() {
    this.showTypeSection = !this.showTypeSection;
  }

  private selectAlternativeType(alternative: { type: Jinja2VariableType; confidence: number; reason: string }) {
    this.localType = alternative.type;

    // Dispatch event to notify parent component
    this.dispatchEvent(new CustomEvent('type-changed', {
      detail: {
        variable: this.variable!,
        oldType: this.typeInference?.type,
        newType: alternative.type,
        confidence: alternative.confidence,
        reason: alternative.reason,
        wasInferred: alternative.confidence < 1.0
      },
      bubbles: true,
      composed: true
    }));
  }

  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    if (confidence >= 0.4) return 'low';
    return 'very-low';
  }

  private getAllTypes(): Jinja2VariableType[] {
    return ['string', 'number', 'integer', 'boolean', 'date', 'time', 'datetime', 'json', 'uuid', 'email', 'url', 'null'];
  }

  show(variable: EnhancedVariable, currentValue: Jinja2VariableValue) {
    this.variable = variable;
    this.currentValue = currentValue;
    this.updateLocalValues();
    this.isVisible = true;

    // Calculate position after DOM update
    void this.updateComplete.then(() => {
      this.calculatePosition();
    });

    this.requestUpdate();
  }

  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.dispatchEvent(new CustomEvent('popover-hide', {
      detail: { variable: this.variable },
      bubbles: true,
      composed: true
    }));
  }

  private calculatePosition() {
    if (!this.variable || !this.targetElement || !this.containerElement) return;

    this.position = calculatePopoverPosition(
      this.variable,
      this.targetElement,
      this.containerElement,
      this.config
    );

    this.updateStyles();
  }

  private reposition() {
    if (!this.variable || !this.targetElement || !this.containerElement) return;

    const newPosition = adjustPositionForScroll(
      this.position!,
      this.targetElement,
      this.containerElement,
      this.config
    );

    if (this.config.animationsEnabled && this.position) {
      this.isAnimating = true;
      void animatePositionChange(
        this,
        this.position,
        newPosition,
        200
      ).then(() => {
        this.isAnimating = false;
        this.position = newPosition;
        this.updateStyles();
      });
    } else {
      this.position = newPosition;
      this.updateStyles();
    }
  }

  private updateStyles() {
    if (!this.position) return;

    const container = this.shadowRoot?.querySelector('.popover-container') as HTMLElement;
    if (!container) return;

    container.style.left = `${this.position.x}px`;
    container.style.top = `${this.position.y}px`;

    // Update arrow position
    this.updateArrowPosition();
  }

  private updateArrowPosition() {
    if (!this.position) return;

    const arrow = this.shadowRoot?.querySelector('.popover-arrow') as HTMLElement;
    if (!arrow) return;

    const arrowPos = getArrowPosition(
      this.position.placement,
      this.targetElement!,
      this.containerElement!,
      320 // Default width
    );

    arrow.className = `popover-arrow ${this.position.placement}`;
    arrow.style.left = `${arrowPos.left}px`;
    arrow.style.top = `${arrowPos.top}px`;
    arrow.style.transform = `rotate(${arrowPos.rotation})`;
  }

  private handleValueChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localValue = value;
  }

  private handleTypeChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localType = value as Jinja2VariableType;
    this.localValue = getDefaultValueForType(this.localType);
  }

  private handleSuggestionClick(suggestion: Jinja2VariableValue) {
    this.localValue = suggestion;
  }

  private applyChanges() {
    if (!this.variable) return;

    const validationError = validateValue(this.localValue, this.localType);
    if (validationError) {
      this.showValidationMessage(validationError);
      return;
    }

    const changeEvent: VariableChangeEventV2 = {
      variable: this.variable,
      oldValue: this.currentValue,
      newValue: this.localValue,
      oldType: this.variable.type,
      newType: this.localType
    };

    this.dispatchEvent(new CustomEvent('variable-change', {
      detail: changeEvent,
      bubbles: true,
      composed: true
    }));

    this.hide();
  }

  private showValidationMessage(message: string) {
    // Show validation message in the popover
    const validationElement = this.shadowRoot?.querySelector('.validation-message') as HTMLElement;
    if (validationElement) {
      validationElement.textContent = message;
      validationElement.style.display = 'flex';

      setTimeout(() => {
        validationElement.style.display = 'none';
      }, 3000);
    }
  }

  private toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  private getQuickSuggestions() {
    if (!this.variable) return [];

    const varName = this.variable.name.toLowerCase();
    const suggestions = this.quickSuggestions[this.localType as keyof typeof this.quickSuggestions];

    if (!suggestions) return [];

    // Find matching suggestions based on variable name
    for (const [pattern, values] of Object.entries(suggestions)) {
      if (varName.includes(pattern)) {
        return values;
      }
    }

    return suggestions.default || [];
  }

  override render() {
    if (!this.variable || !this.isVisible) return null;

    const quickSuggestions = this.config.showSuggestions ? this.getQuickSuggestions() : [];
    const validationError = validateValue(this.localValue, this.localType);

    return html`
      <div class="popover-container ${classMap({
        visible: this.isVisible,
        animating: this.isAnimating
      })}" style=${styleMap(this.position ? {
        left: `${this.position.x}px`,
        top: `${this.position.y}px`
      } : {})}>
        <div class="popover-arrow"></div>

        <!-- Header -->
        <div class="popover-header">
          <div class="variable-info">
            <div class="variable-name">
              ${this.variable.name}
              ${this.variable.isRequired ? html`<span class="required-badge">Required</span>` : ''}
            </div>
            <div class="variable-type">${this.localType}</div>
          </div>
          <button class="close-button" @click=${this.hide} title="Close">
            ×
          </button>
        </div>

        <!-- Content -->
        <div class="popover-content">
          <!-- Type and Value -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <v2-select
                .value=${this.localType}
                .options=${[
                  { value: 'string', label: 'Text' },
                  { value: 'number', label: 'Number' },
                  { value: 'integer', label: 'Integer' },
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'date', label: 'Date' },
                  { value: 'datetime', label: 'DateTime' },
                  { value: 'json', label: 'JSON' },
                  { value: 'uuid', label: 'UUID' },
                  { value: 'email', label: 'Email' },
                  { value: 'url', label: 'URL' },
                  { value: 'null', label: 'Null' }
                ]}
                @change=${this.handleTypeChange}
              ></v2-select>
            </div>

            <div class="form-group">
              <label class="form-label">Value</label>
              <v2-input
                type=${this.getInputType(this.localType)}
                .value=${this.formatValue(this.localValue)}
                .placeholder=${`Enter ${this.variable.name}`}
                @change=${this.handleValueChange}
              ></v2-input>
            </div>
          </div>

          <!-- Quick Suggestions -->
          ${quickSuggestions.length > 0 ? html`
            <div class="form-group">
              <label class="form-label">Quick Suggestions</label>
              <div class="quick-suggestions">
                ${quickSuggestions.map((suggestion: Jinja2VariableValue) => html`
                  <button
                    class="suggestion-chip ${classMap({
                      active: this.isValueActive(suggestion)
                    })}"
                    @click=${() => this.handleSuggestionClick(suggestion)}
                    title=${this.formatSuggestion(suggestion)}
                  >
                    ${this.formatSuggestion(suggestion)}
                  </button>
                `)}
              </div>
            </div>
          ` : ''}

          <!-- Memory Section -->
          ${this.memoryEnabled && this.rememberedValues.length > 0 ? html`
            <div class="memory-section">
              <div class="memory-header" @click=${this.toggleMemorySection}>
                <span class="memory-toggle ${classMap({ collapsed: !this.showMemorySection })}">▶</span>
                <span>📝 Remembered Values (${this.rememberedValues.length})</span>
              </div>
              <div class="memory-content ${classMap({ collapsed: !this.showMemorySection })}">
                <div class="remembered-values">
                  ${this.rememberedValues.map((rememberedValue: RememberedValue) => html`
                    <div
                      class="remembered-value ${classMap({
                        selected: this.isRememberedValueSelected(rememberedValue)
                      })}"
                      @click=${() => this.handleRememberedValueClick(rememberedValue)}
                      title="${this.formatRememberedValue(rememberedValue.value)} (Type: ${rememberedValue.type}, Used: ${rememberedValue.usageCount}x, Confidence: ${(rememberedValue.confidence * 100).toFixed(1)}%)"
                    >
                      <div class="confidence-indicator ${this.getConfidenceClass(rememberedValue.confidence)}"></div>
                      <span class="value-text">${this.formatRememberedValue(rememberedValue.value)}</span>
                      <span class="usage-count">${rememberedValue.usageCount}</span>
                      <button
                        class="remove-memory"
                        @click=${(e: MouseEvent) => this.removeRememberedValue(e, rememberedValue)}
                        title="Remove this remembered value"
                      >
                        ×
                      </button>
                    </div>
                  `)}
                </div>

                <!-- Memory Statistics -->
                ${this.rememberedValues.length > 1 ? html`
                  <div class="memory-stats">
                    <strong>Memory Statistics:</strong>
                    Most used: ${this.getMostUsedValue()} |
                    Average confidence: ${this.getAverageConfidence().toFixed(2)}
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Memory Empty State -->
          ${this.memoryEnabled && this.rememberedValues.length === 0 ? html`
            <div class="memory-section">
              <div class="memory-header" @click=${this.toggleMemorySection}>
                <span class="memory-toggle ${classMap({ collapsed: !this.showMemorySection })}">▶</span>
                <span>📝 Remembered Values</span>
              </div>
              <div class="memory-content ${classMap({ collapsed: !this.showMemorySection })}">
                <div class="memory-empty">
                  No remembered values for this variable yet. Values you use will be automatically remembered for future sessions.
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Type Inference Section -->
          ${this.showTypeInference && this.typeInference ? html`
            <div class="type-inference-section">
              <div class="type-inference-header" @click=${this.toggleTypeSection}>
                <span class="memory-toggle ${classMap({ collapsed: !this.showTypeSection })}">▶</span>
                <span>🧠 Type Inference (${Math.round(this.typeInference.confidence * 100)}% confidence)</span>
              </div>
              <div class="type-inference-content ${classMap({ collapsed: !this.showTypeSection })}">
                <div class="inference-details ${this.getConfidenceClass(this.typeInference.confidence)}">
                  <div class="confidence-label">
                    <span>Inferred Type: <strong>${this.typeInference.type}</strong></span>
                    <span class="confidence-value ${this.getConfidenceClass(this.typeInference.confidence)}">
                      ${Math.round(this.typeInference.confidence * 100)}%
                    </span>
                  </div>
                  <div class="confidence-bar">
                    <div
                      class="confidence-fill ${this.getConfidenceClass(this.typeInference.confidence)}"
                      style="--confidence-percent: ${this.typeInference.confidence * 100}%"
                    ></div>
                  </div>
                  ${this.typeInference.reasons && this.typeInference.reasons.length > 0 ? html`
                    <div class="inference-reasons">
                      ${this.typeInference.reasons.map(reason => html`
                        <div class="inference-reason">
                          <span class="inference-reason-bullet">•</span>
                          <span>${reason}</span>
                        </div>
                      `)}
                    </div>
                  ` : ''}
                </div>

                <!-- Alternative Type Suggestions -->
                ${this.typeInference.alternatives && this.typeInference.alternatives.length > 0 ? html`
                  <div class="inference-alternatives">
                    <div class="type-suggestion-label">Alternative types:</div>
                    <div class="alternative-types">
                      ${this.typeInference.alternatives.map(alt => html`
                        <button
                          class="alternative-type"
                          @click=${() => this.selectAlternativeType(alt)}
                          title="${alt.reason} (Confidence: ${Math.round(alt.confidence * 100)}%)"
                        >
                          <span>${alt.type}</span>
                          <span class="alternative-confidence">${Math.round(alt.confidence * 100)}%</span>
                        </button>
                      `)}
                    </div>
                  </div>
                ` : ''}

                <!-- Type Override Options -->
                <div class="type-suggestions">
                  <div class="type-suggestion-label">Manual override:</div>
                  <div class="alternative-types">
                    ${this.getAllTypes().filter(type => type !== this.typeInference.type).map(type => html`
                      <button
                        class="alternative-type"
                        @click=${() => this.selectAlternativeType({ type, confidence: 1.0, reason: 'Manual override' })}
                        title="Override inferred type manually"
                      >
                        <span>${type}</span>
                      </button>
                    `)}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Context Information -->
          ${this.variable.context?.semanticContext ? html`
            <div class="context-info">
              <div class="context-label">Context:</div>
              <div class="context-value">${this.variable.context.semanticContext}</div>
            </div>
          ` : ''}

          <!-- Validation Message -->
          ${validationError ? html`
            <div class="validation-message">
              <span>⚠</span>
              <span>${validationError}</span>
            </div>
          ` : ''}

          <!-- Advanced Options -->
          <div class="advanced-options">
            <button class="advanced-toggle" @click=${this.toggleAdvancedOptions}>
              <span>${this.showAdvancedOptions ? '▼' : '▶'}</span>
              <span>Advanced Options</span>
            </button>
            <div class="advanced-content ${classMap({ visible: this.showAdvancedOptions })}">
              <div class="form-group">
                <label class="form-label">Description</label>
                <div>${this.variable.description || 'No description available'}</div>
              </div>
              <div class="form-group">
                <label class="form-label">Position</label>
                <div>Line ${this.variable.position.line}, Column ${this.variable.position.column}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="popover-actions">
          <button class="action-button secondary" @click=${this.hide}>
            Cancel
          </button>
          <button class="action-button primary" @click=${this.applyChanges}>
            ✓ Apply
          </button>
        </div>
      </div>
    `;
  }

  private getInputType(type: string): string {
    const typeMap: Record<string, string> = {
      email: 'email',
      url: 'url',
      number: 'number',
      integer: 'number',
      date: 'date',
      datetime: 'datetime-local'
    };
    return typeMap[type] || 'text';
  }

  private formatValue(value: Jinja2VariableValue): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private formatSuggestion(suggestion: Jinja2VariableValue): string {
    const formatted = this.formatValue(suggestion);
    return formatted.length > 15 ? formatted.substring(0, 12) + '...' : formatted;
  }

  private isValueActive(suggestion: Jinja2VariableValue): boolean {
    if (typeof this.localValue === 'number' && typeof suggestion === 'number') {
      return this.localValue === suggestion;
    }
    return String(this.localValue) === String(suggestion);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-popover': VariablePopover;
  }
}
