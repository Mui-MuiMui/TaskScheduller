import * as vscode from 'vscode';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'taskScheduller.sidebarView';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === 'openMainView') {
        vscode.commands.executeCommand('taskScheduller.openMainView');
      }
    });
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          padding: 16px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .open-button {
          width: 100%;
          padding: 10px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .open-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .description {
          margin-top: 16px;
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          text-align: center;
        }
        .icon {
          width: 16px;
          height: 16px;
        }
      </style>
    </head>
    <body>
      <button class="open-button" onclick="openMainView()">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
        Open TaskScheduller
      </button>
      <p class="description">
        Click to open the task manager in an editor tab with Todo, Kanban, and Gantt views.
      </p>
      <script>
        const vscode = acquireVsCodeApi();
        function openMainView() {
          vscode.postMessage({ command: 'openMainView' });
        }
      </script>
    </body>
    </html>`;
  }
}
