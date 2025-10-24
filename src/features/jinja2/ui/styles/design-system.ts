/**
 * Design System for V2 Editor
 *
 * Complete design tokens and CSS custom properties
 */

/**
 * Spacing scale (8px base unit)
 */
export const SPACING = {
  xs: '4px',    // 0.5rem
  sm: '8px',    // 1rem
  md: '12px',   // 1.5rem
  lg: '16px',   // 2rem
  xl: '24px',   // 3rem
  xxl: '32px',  // 4rem
  xxxl: '48px'  // 6rem
} as const;

/**
 * Typography scale
 */
export const TYPOGRAPHY = {
  fontSize: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
    xl: '16px',
    xxl: '18px',
    xxxl: '20px'
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: '1.3',
    normal: '1.5',
    relaxed: '1.6',
    loose: '1.8'
  },
  fontFamily: {
    mono: '"Consolas", "Monaco", "Courier New", monospace',
    sans: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  }
} as const;

/**
 * Border radius scale
 */
export const BORDER_RADIUS = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '50%'
} as const;

/**
 * Shadow scale
 */
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 2px 6px rgba(0, 0, 0, 0.15)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.2)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.25)',
  glow: '0 0 20px rgba(66, 133, 244, 0.3)',
  focus: '0 0 0 2px rgba(66, 133, 244, 0.2)'
} as const;

/**
 * Z-index scale
 */
export const Z_INDEX = {
  base: '1',
  dropdown: '10',
  sticky: '20',
  fixed: '30',
  overlay: '40',
  modal: '50',
  popover: '60',
  tooltip: '70',
  toast: '80',
  maximum: '100'
} as const;

/**
 * Breakpoints
 */
export const BREAKPOINTS = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px'
} as const;

/**
 * Transition durations
 */
export const TRANSITIONS = {
  instant: '0ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms'
} as const;

/**
 * Transition easings
 */
export const EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  swift: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
} as const;

/**
 * Generate CSS custom properties
 */
export function generateDesignSystemCSS(): string {
  return `
    :root {
      /* Spacing */
      --spacing-xs: ${SPACING.xs};
      --spacing-sm: ${SPACING.sm};
      --spacing-md: ${SPACING.md};
      --spacing-lg: ${SPACING.lg};
      --spacing-xl: ${SPACING.xl};
      --spacing-xxl: ${SPACING.xxl};
      --spacing-xxxl: ${SPACING.xxxl};

      /* Typography */
      --font-size-xs: ${TYPOGRAPHY.fontSize.xs};
      --font-size-sm: ${TYPOGRAPHY.fontSize.sm};
      --font-size-md: ${TYPOGRAPHY.fontSize.md};
      --font-size-lg: ${TYPOGRAPHY.fontSize.lg};
      --font-size-xl: ${TYPOGRAPHY.fontSize.xl};
      --font-size-xxl: ${TYPOGRAPHY.fontSize.xxl};
      --font-size-xxxl: ${TYPOGRAPHY.fontSize.xxxl};

      --font-weight-normal: ${TYPOGRAPHY.fontWeight.normal};
      --font-weight-medium: ${TYPOGRAPHY.fontWeight.medium};
      --font-weight-semibold: ${TYPOGRAPHY.fontWeight.semibold};
      --font-weight-bold: ${TYPOGRAPHY.fontWeight.bold};

      --line-height-tight: ${TYPOGRAPHY.lineHeight.tight};
      --line-height-normal: ${TYPOGRAPHY.lineHeight.normal};
      --line-height-relaxed: ${TYPOGRAPHY.lineHeight.relaxed};
      --line-height-loose: ${TYPOGRAPHY.lineHeight.loose};

      --font-family-mono: ${TYPOGRAPHY.fontFamily.mono};
      --font-family-sans: ${TYPOGRAPHY.fontFamily.sans};
      --font-family-system: ${TYPOGRAPHY.fontFamily.system};

      /* Border Radius */
      --border-radius-none: ${BORDER_RADIUS.none};
      --border-radius-sm: ${BORDER_RADIUS.sm};
      --border-radius-md: ${BORDER_RADIUS.md};
      --border-radius-lg: ${BORDER_RADIUS.lg};
      --border-radius-xl: ${BORDER_RADIUS.xl};
      --border-radius-full: ${BORDER_RADIUS.full};

      /* Shadows */
      --shadow-none: ${SHADOWS.none};
      --shadow-sm: ${SHADOWS.sm};
      --shadow-md: ${SHADOWS.md};
      --shadow-lg: ${SHADOWS.lg};
      --shadow-xl: ${SHADOWS.xl};
      --shadow-glow: ${SHADOWS.glow};
      --shadow-focus: ${SHADOWS.focus};

      /* Z Index */
      --z-index-base: ${Z_INDEX.base};
      --z-index-dropdown: ${Z_INDEX.dropdown};
      --z-index-sticky: ${Z_INDEX.sticky};
      --z-index-fixed: ${Z_INDEX.fixed};
      --z-index-overlay: ${Z_INDEX.overlay};
      --z-index-modal: ${Z_INDEX.modal};
      --z-index-popover: ${Z_INDEX.popover};
      --z-index-tooltip: ${Z_INDEX.tooltip};
      --z-index-toast: ${Z_INDEX.toast};
      --z-index-maximum: ${Z_INDEX.maximum};

      /* Transitions */
      --transition-instant: ${TRANSITIONS.instant};
      --transition-fast: ${TRANSITIONS.fast};
      --transition-normal: ${TRANSITIONS.normal};
      --transition-slow: ${TRANSITIONS.slow};
      --transition-slower: ${TRANSITIONS.slower};

      --easing-linear: ${EASING.linear};
      --easing-ease: ${EASING.ease};
      --easing-ease-in: ${EASING.easeIn};
      --easing-ease-out: ${EASING.easeOut};
      --easing-ease-in-out: ${EASING.easeInOut};
      --easing-bounce: ${EASING.bounce};
      --easing-smooth: ${EASING.smooth};
      --easing-swift: ${EASING.swift};

      /* Component specific variables */
      --border-width: 1px;
      --scrollbar-width: 8px;
      --focus-ring-width: 2px;
      --popover-arrow-size: 8px;
      --loading-spinner-size: 32px;

      /* Layout */
      --sidebar-width: 280px;
      --header-height: 60px;
      --footer-height: 40px;
      --toolbar-height: 48px;
      --status-bar-height: 32px;

      /* Grid */
      --grid-columns: 12;
      --grid-gap: ${SPACING.md};
      --grid-gap-sm: ${SPACING.sm};
      --grid-gap-lg: ${SPACING.lg};
    }

    /* Responsive design variables */
    @media (max-width: ${BREAKPOINTS.sm}) {
      :root {
        --font-size-md: 12px;
        --font-size-lg: 13px;
        --spacing-md: 8px;
        --spacing-lg: 12px;
      }
    }

    @media (max-width: ${BREAKPOINTS.xs}) {
      :root {
        --font-size-sm: 11px;
        --font-size-md: 12px;
        --spacing-sm: 4px;
        --spacing-md: 8px;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      :root {
        --border-width: 2px;
        --focus-ring-width: 3px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      :root {
        --transition-instant: 0ms;
        --transition-fast: 0ms;
        --transition-normal: 0ms;
        --transition-slow: 0ms;
        --transition-slower: 0ms;
      }
    }

    /* Dark mode variables (will be overridden by theme) */
    @media (prefers-color-scheme: dark) {
      :root {
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.4);
        --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.5);
      }
    }

    /* Light mode variables (will be overridden by theme) */
    @media (prefers-color-scheme: light) {
      :root {
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
        --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.15);
        --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }
  `;
}

/**
 * Mixin utilities for common patterns
 */
export const MIXINS = {
  // Focus styles
  focus: `
    outline: none;
    box-shadow: var(--shadow-focus);
  `,

  focusVisible: `
    &:focus-visible {
      outline: none;
      box-shadow: var(--shadow-focus);
    }
  `,

  // Button base styles
  button: `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width) solid transparent;
    border-radius: var(--border-radius-sm);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    text-decoration: none;
    cursor: pointer;
    transition: all var(--transition-fast) var(--easing-smooth);
    user-select: none;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--shadow-focus);
    }
  `,

  // Input base styles
  input: `
    display: block;
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width) solid var(--vscode-input-border);
    border-radius: var(--border-radius-sm);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    transition: all var(--transition-fast) var(--easing-smooth);

    &::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    &:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
      box-shadow: var(--shadow-focus);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,

  // Card base styles
  card: `
    background: var(--vscode-editor-background);
    border: var(--border-width) solid var(--vscode-widget-border);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  `,

  // Scrollbar styles
  scrollbar: `
    &::-webkit-scrollbar {
      width: var(--scrollbar-width);
      height: var(--scrollbar-width);
    }

    &::-webkit-scrollbar-track {
      background: var(--vscode-scrollbarSlider-background);
    }

    &::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
      border-radius: var(--border-radius-full);
      border: 2px solid transparent;
      background-clip: content-box;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
      background-clip: content-box;
    }

    &::-webkit-scrollbar-corner {
      background: var(--vscode-editor-background);
    }
  `,

  // Truncate text
  truncate: `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  // Visually hidden (for screen readers)
  visuallyHidden: `
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  `
} as const;

/**
 * Theme utilities
 */
export const THEME_UTILS = {
  /**
   * Generate theme-aware CSS variables
   */
  generateThemeVariables(theme: 'dark' | 'light' | 'high-contrast'): string {
    const themes = {
      dark: {
        '--vscode-editor-background': '#1e1e1e',
        '--vscode-editor-foreground': '#d4d4d4',
        '--vscode-editor-lineNumbers-background': '#1e1e1e',
        '--vscode-editorLineNumbers-foreground': '#858585',
        '--vscode-input-background': '#3c3c3c',
        '--vscode-input-foreground': '#cccccc',
        '--vscode-input-border': '#3c3c3c',
        '--vscode-input-placeholderForeground': '#cccccc',
        '--vscode-focusBorder': '#007fd4',
        '--vscode-widget-border': '#3c3c3c',
        '--vscode-button-background': '#0e639c',
        '--vscode-button-foreground': '#ffffff',
        '--vscode-button-border': '#0e639c',
        '--vscode-button-hoverBackground': '#1177bb',
        '--vscode-button-secondaryBackground': '#3c3c3c',
        '--vscode-button-secondaryForeground': '#cccccc',
        '--vscode-button-secondaryBorder': '#3c3c3c',
        '--vscode-button-secondaryHoverBackground': '#4a4a4a',
        '--vscode-textBlockQuote-background': '#2d2d30',
        '--vscode-textLink-foreground': '#3794ff',
        '--vscode-textLink-activeForeground': '#3794ff',
        '--vscode-descriptionForeground': '#9d9d9d',
        '--vscode-errorForeground': '#f14c4c',
        '--vscode-warningForeground': '#ffcc02',
        '--vscode-icon-foreground': '#cccccc',
        '--vscode-charts-blue': '#3794ff',
        '--vscode-charts-green': '#89d185',
        '--vscode-charts-orange': '#d18616',
        '--vscode-charts-red': '#f48771',
        '--vscode-charts-purple': '#b180d7',
        '--vscode-charts-yellow': '#ffcc02',
        '--vscode-charts-cyan': '#3794ff',
        '--vscode-scrollbarSlider-background': '#797979',
        '--vscode-scrollbarSlider-hoverBackground': '#646464',
        '--vscode-badge-background': '#4d4d4d',
        '--vscode-badge-foreground': '#ffffff'
      },
      light: {
        '--vscode-editor-background': '#ffffff',
        '--vscode-editor-foreground': '#333333',
        '--vscode-editor-lineNumbers-background': '#f3f3f3',
        '--vscode-editorLineNumbers-foreground': '#237893',
        '--vscode-input-background': '#ffffff',
        '--vscode-input-foreground': '#333333',
        '--vscode-input-border': '#cecece',
        '--vscode-input-placeholderForeground': '#767676',
        '--vscode-focusBorder': '#007fd4',
        '--vscode-widget-border': '#e1e1e1',
        '--vscode-button-background': '#007acc',
        '--vscode-button-foreground': '#ffffff',
        '--vscode-button-border': '#007acc',
        '--vscode-button-hoverBackground': '#005a9e',
        '--vscode-button-secondaryBackground': '#f3f3f3',
        '--vscode-button-secondaryForeground': '#333333',
        '--vscode-button-secondaryBorder': '#f3f3f3',
        '--vscode-button-secondaryHoverBackground': '#e8e8e8',
        '--vscode-textBlockQuote-background': '#f8f8f8',
        '--vscode-textLink-foreground': '#006ab1',
        '--vscode-textLink-activeForeground': '#006ab1',
        '--vscode-descriptionForeground': '#717171',
        '--vscode-errorForeground': '#e51400',
        '--vscode-warningForeground': '#bf8803',
        '--vscode-icon-foreground': '#333333',
        '--vscode-charts-blue': '#007acc',
        '--vscode-charts-green': '#388a34',
        '--vscode-charts-orange': '#bf8803',
        '--vscode-charts-red': '#e51400',
        '--vscode-charts-purple': '#a125ff',
        '--vscode-charts-yellow': '#bf8803',
        '--vscode-charts-cyan': '#007acc',
        '--vscode-scrollbarSlider-background': '#797979',
        '--vscode-scrollbarSlider-hoverBackground': '#646464',
        '--vscode-badge-background': '#e1e1e1',
        '--vscode-badge-foreground': '#333333'
      },
      'high-contrast': {
        '--vscode-editor-background': '#000000',
        '--vscode-editor-foreground': '#ffffff',
        '--vscode-editor-lineNumbers-background': '#000000',
        '--vscode-editorLineNumbers-foreground': '#ffffff',
        '--vscode-input-background': '#000000',
        '--vscode-input-foreground': '#ffffff',
        '--vscode-input-border': '#ffffff',
        '--vscode-input-placeholderForeground': '#ffffff',
        '--vscode-focusBorder': '#f38518',
        '--vscode-widget-border': '#ffffff',
        '--vscode-button-background': '#0060c0',
        '--vscode-button-foreground': '#ffffff',
        '--vscode-button-border': '#ffffff',
        '--vscode-button-hoverBackground': '#4096ff',
        '--vscode-button-secondaryBackground': '#000000',
        '--vscode-button-secondaryForeground': '#ffffff',
        '--vscode-button-secondaryBorder': '#ffffff',
        '--vscode-button-secondaryHoverBackground': '#4096ff',
        '--vscode-textBlockQuote-background': '#000000',
        '--vscode-textLink-foreground': '#9cdcfe',
        '--vscode-textLink-activeForeground': '#9cdcfe',
        '--vscode-descriptionForeground': '#9d9d9d',
        '--vscode-errorForeground': '#f48771',
        '--vscode-warningForeground': '#ffd602',
        '--vscode-icon-foreground': '#ffffff',
        '--vscode-charts-blue': '#4096ff',
        '--vscode-charts-green': '#89d185',
        '--vscode-charts-orange': '#d18616',
        '--vscode-charts-red': '#f48771',
        '--vscode-charts-purple': '#b180d7',
        '--vscode-charts-yellow': '#ffd602',
        '--vscode-charts-cyan': '#4096ff',
        '--vscode-scrollbarSlider-background': '#ffffff',
        '--vscode-scrollbarSlider-hoverBackground': '#f38518',
        '--vscode-badge-background': '#000000',
        '--vscode-badge-foreground': '#ffffff'
      }
    };

    const themeColors = themes[theme];
    if (!themeColors) return '';

    return Object.entries(themeColors)
      .map(([property, value]) => `${property}: ${value};`)
      .join('\n');
  }
} as const;
