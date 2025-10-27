/**
 * V2 Editor App Initialization
 *
 * This script initializes the V2 editor when the webview loads
 */


window.initializeV2Editor = function() {


  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }


  document.body.innerHTML += '<div style="padding: 20px; color: var(--vscode-foreground);">V2 Editor Loaded Successfully! ✅</div>';


  if (window.vscode) {
    window.vscode.postMessage({
      command: 'ready',
      data: 'V2 Editor is ready'
    });
  }
};


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initializeV2Editor);
} else {
  window.initializeV2Editor();
}

export {};
