/**
 * External Library Type Definitions
 *
 * Type definitions for third-party libraries used in V2 editor
 */

/**
 * Highlight.js API type definitions
 */
export interface HighlightJsResult {
  value: string;
  language?: string;
  relevance?: number;
  illegal?: boolean;
  top?: number;
  code?: string;
}

export interface HighlightJsLanguage {
  name: string;
  rawDefinition?: unknown;
  aliases?: string[];
  case_insensitive?: boolean;
  keywords?: Record<string, unknown>;
  contains?: unknown[];
}

export interface HighlightJsOptions {
  classPrefix?: string;
  tabReplace?: string | null;
  useBR?: boolean;
  languages?: string[];
}

export interface HighlightJs {
  /** Highlight code with language auto-detection */
  highlightAuto: (code: string, languageSubset?: string[]) => HighlightJsResult;

  /** Highlight code with specific language and options */
  highlight: (code: string, options: { language: string; ignoreIllegals?: boolean }) => HighlightJsResult;

  /** Configure highlight.js */
  configure: (options: HighlightJsOptions) => void;

  /** Get list of available languages */
  listLanguages: () => string[];

  /** Register a language */
  registerLanguage: (name: string, language: HighlightJsLanguage) => void;

  /** Get language by name or alias */
  getLanguage: (name: string) => HighlightJsLanguage | undefined;

  /** Add plugin */
  addPlugin?: (plugin: unknown) => void;

  /** Debug mode */
  debugMode?: () => void;
}

/**
 * Nunjucks template engine types (simplified for our use case)
 */
export interface NunjucksEnvironment {
  /** Render template string */
  renderString: (template: string, context: Record<string, unknown>) => string;

  /** Parse template */
  parse: (template: string) => NunjucksTemplate;

  /** Add filter */
  addFilter: (name: string, func: (...args: unknown[]) => unknown) => void;

  /** Add global */
  addGlobal: (name: string, value: unknown) => void;
}

export interface NunjucksTemplate {
  /** Render template with context */
  render: (context: Record<string, unknown>) => string;
}

/**
 * Webview message types for VS Code communication
 */
export interface VscodeWebviewMessage {
  command: string;
  data?: unknown;
  timestamp?: number;
}

export interface VscodeWebviewResponse {
  type: string;
  data?: unknown;
  error?: string;
}

/**
 * DOM event types for webview interactions
 */
export interface CustomWebviewEvent extends Event {
  detail?: {
    variableName?: string;
    value?: unknown;
    action?: string;
    position?: { x: number; y: number };
  };
}

/**
 * Global declarations for external libraries
 */
declare global {
  interface Window {
    /** Highlight.js instance loaded from resources */
    hljs?: HighlightJs;

    /** VS Code API for webview communication */
    vscode?: {
      postMessage: (message: VscodeWebviewMessage) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };

    /** V2 Editor initialization function */
    initializeV2Editor: () => void;
  }

  var hljs: HighlightJs;
}

export {};
