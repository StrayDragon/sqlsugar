/**
 * Templated SQL Editor App Initialization
 *
 * This script initializes the Templated SQL editor when the webview loads
 */


window.initializeTemplatedSqlEditor = function() {


  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }


  document.body.innerHTML += '<div style="padding: 20px; color: var(--vscode-foreground);">Templated SQL Editor Loaded Successfully! ✅</div>';


  if (window.vscode) {
    window.vscode.postMessage({
      command: 'ready',
      data: 'Templated SQL Editor is ready'
    });
  }
};


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initializeTemplatedSqlEditor);
} else {
  window.initializeTemplatedSqlEditor();
}

export {};
