/**
 * V2 Editor App Initialization
 *
 * This script initializes the V2 editor when the webview loads
 */

declare global {
  interface Window {
    initializeV2Editor: () => void;
  }
}


// Simple initialization function
window.initializeV2Editor = function() {

  // Hide loading indicator
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  // Show success message temporarily
  document.body.innerHTML += '<div style="padding: 20px; color: var(--vscode-foreground);">V2 Editor Loaded Successfully! ✅</div>';

  // Send ready message to VS Code
  if (window.vscode) {
    window.vscode.postMessage({
      command: 'ready',
      message: 'V2 Editor is ready'
    });
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initializeV2Editor);
} else {
  window.initializeV2Editor();
}

export {};
