import * as vscode from 'vscode';
import type { DatabaseManager } from '../database/DatabaseManager';
import { TaskService } from '../services/TaskService';
import type {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  TasksLoadedMessage,
  TaskCreatedMessage,
  TaskUpdatedMessage,
  TaskDeletedMessage,
  LabelCreatedMessage,
  DependencyCreatedMessage,
  DependencyDeletedMessage,
  ErrorMessage,
} from '../models/messages';

export class TaskSchedullerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'taskScheduller.mainView';

  private _view?: vscode.WebviewView;
  private _taskService: TaskService;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _databaseManager: DatabaseManager
  ) {
    this._taskService = new TaskService(_databaseManager);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(this._extensionUri, 'resources'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) =>
      this._handleMessage(message)
    );

    // Send initial config when view becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._sendConfig();
      }
    });
  }

  public sendCommand(command: string, payload?: unknown): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'COMMAND',
        command,
        payload,
      });
    }
  }

  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'WEBVIEW_READY':
          await this._sendInitialData(message.id);
          break;

        case 'LOAD_TASKS':
          await this._loadTasks(message.id, message.payload?.filter);
          break;

        case 'CREATE_TASK':
          await this._createTask(message.id, message.payload);
          break;

        case 'UPDATE_TASK':
          await this._updateTask(message.id, message.payload.taskId, message.payload.updates);
          break;

        case 'UPDATE_TASK_STATUS':
          await this._updateTaskStatus(message.id, message.payload.taskId, message.payload.status);
          break;

        case 'DELETE_TASK':
          await this._deleteTask(message.id, message.payload.taskId);
          break;

        case 'REORDER_TASKS':
          await this._reorderTasks(message.id, message.payload.taskIds, message.payload.status);
          break;

        case 'CREATE_LABEL':
          await this._createLabel(message.id, message.payload);
          break;

        case 'DELETE_LABEL':
          await this._deleteLabel(message.id, message.payload.labelId);
          break;

        case 'CREATE_DEPENDENCY':
          await this._createDependency(message.id, message.payload);
          break;

        case 'DELETE_DEPENDENCY':
          await this._deleteDependency(message.id, message.payload.dependencyId);
          break;

        case 'EXPORT_DATA':
          await this._exportData(message.payload.format);
          break;

        default:
          console.warn('Unknown message type:', (message as { type: string }).type);
      }
    } catch (error) {
      this._postError(message.id, 'OPERATION_FAILED', (error as Error).message);
    }
  }

  private async _sendInitialData(requestId: string): Promise<void> {
    this._sendConfig();
    await this._loadTasks(requestId);
  }

  private _sendConfig(): void {
    const config = vscode.workspace.getConfiguration('taskScheduller');
    this._postMessage({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'CONFIG_CHANGED',
      payload: {
        locale: vscode.env.language,
        theme: this._getTheme(),
      },
    });
  }

  private _getTheme(): 'light' | 'dark' | 'high-contrast' {
    const kind = vscode.window.activeColorTheme.kind;
    switch (kind) {
      case vscode.ColorThemeKind.Light:
        return 'light';
      case vscode.ColorThemeKind.Dark:
        return 'dark';
      case vscode.ColorThemeKind.HighContrast:
      case vscode.ColorThemeKind.HighContrastLight:
        return 'high-contrast';
      default:
        return 'dark';
    }
  }

  private async _loadTasks(
    requestId: string,
    filter?: WebviewToExtensionMessage extends { payload?: { filter?: infer F } } ? F : never
  ): Promise<void> {
    const tasks = this._taskService.getAllTasks(filter);
    const labels = this._taskService.getAllLabels();
    const dependencies = this._taskService.getAllDependencies();

    const message: TasksLoadedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'TASKS_LOADED',
      payload: { tasks, labels, dependencies },
    };
    this._postMessage(message);
  }

  private async _createTask(
    requestId: string,
    payload: WebviewToExtensionMessage extends { type: 'CREATE_TASK'; payload: infer P }
      ? P
      : never
  ): Promise<void> {
    const task = this._taskService.createTask(payload);
    const message: TaskCreatedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'TASK_CREATED',
      payload: { task },
    };
    this._postMessage(message);

    vscode.window.showInformationMessage(vscode.l10n.t('message.taskCreated', task.title));
  }

  private async _updateTask(
    requestId: string,
    taskId: string,
    updates: WebviewToExtensionMessage extends {
      type: 'UPDATE_TASK';
      payload: { updates: infer U };
    }
      ? U
      : never
  ): Promise<void> {
    const task = this._taskService.updateTask(taskId, updates);
    if (task) {
      const message: TaskUpdatedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'TASK_UPDATED',
        payload: { task },
      };
      this._postMessage(message);
    } else {
      this._postError(requestId, 'TASK_NOT_FOUND', 'Task not found');
    }
  }

  private async _updateTaskStatus(
    requestId: string,
    taskId: string,
    status: WebviewToExtensionMessage extends {
      type: 'UPDATE_TASK_STATUS';
      payload: { status: infer S };
    }
      ? S
      : never
  ): Promise<void> {
    const task = this._taskService.updateTaskStatus(taskId, status);
    if (task) {
      const message: TaskUpdatedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'TASK_UPDATED',
        payload: { task },
      };
      this._postMessage(message);
    } else {
      this._postError(requestId, 'TASK_NOT_FOUND', 'Task not found');
    }
  }

  private async _deleteTask(requestId: string, taskId: string): Promise<void> {
    const success = this._taskService.deleteTask(taskId);
    if (success) {
      const message: TaskDeletedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'TASK_DELETED',
        payload: { taskId },
      };
      this._postMessage(message);

      vscode.window.showInformationMessage(vscode.l10n.t('message.taskDeleted'));
    } else {
      this._postError(requestId, 'TASK_NOT_FOUND', 'Task not found');
    }
  }

  private async _reorderTasks(
    requestId: string,
    taskIds: string[],
    status?: WebviewToExtensionMessage extends {
      type: 'REORDER_TASKS';
      payload: { status?: infer S };
    }
      ? S
      : never
  ): Promise<void> {
    this._taskService.reorderTasks(taskIds, status);
    // Reload tasks after reorder
    await this._loadTasks(requestId);
  }

  private async _createLabel(
    requestId: string,
    payload: WebviewToExtensionMessage extends { type: 'CREATE_LABEL'; payload: infer P }
      ? P
      : never
  ): Promise<void> {
    const label = this._taskService.createLabel(payload);
    const message: LabelCreatedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'LABEL_CREATED',
      payload: { label },
    };
    this._postMessage(message);
  }

  private async _deleteLabel(requestId: string, labelId: string): Promise<void> {
    const success = this._taskService.deleteLabel(labelId);
    if (!success) {
      this._postError(requestId, 'LABEL_NOT_FOUND', 'Label not found');
    }
    // Reload all data after label deletion
    await this._loadTasks(requestId);
  }

  private async _createDependency(
    requestId: string,
    payload: WebviewToExtensionMessage extends { type: 'CREATE_DEPENDENCY'; payload: infer P }
      ? P
      : never
  ): Promise<void> {
    const dependency = this._taskService.createDependency(payload);
    const message: DependencyCreatedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'DEPENDENCY_CREATED',
      payload: { dependency },
    };
    this._postMessage(message);
  }

  private async _deleteDependency(requestId: string, dependencyId: string): Promise<void> {
    const success = this._taskService.deleteDependency(dependencyId);
    if (success) {
      const message: DependencyDeletedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'DEPENDENCY_DELETED',
        payload: { dependencyId },
      };
      this._postMessage(message);
    } else {
      this._postError(requestId, 'DEPENDENCY_NOT_FOUND', 'Dependency not found');
    }
  }

  private async _exportData(format: 'json' | 'csv' | 'markdown'): Promise<void> {
    let content: string;
    let filename: string;
    let language: string;

    switch (format) {
      case 'json':
        content = this._taskService.exportToJson();
        filename = 'tasks.json';
        language = 'json';
        break;
      case 'csv':
        content = this._taskService.exportToCsv();
        filename = 'tasks.csv';
        language = 'csv';
        break;
      case 'markdown':
        content = this._taskService.exportToMarkdown();
        filename = 'tasks.md';
        language = 'markdown';
        break;
    }

    const doc = await vscode.workspace.openTextDocument({
      content,
      language,
    });
    await vscode.window.showTextDocument(doc);
  }

  private _postMessage(message: ExtensionToWebviewMessage): void {
    this._view?.webview.postMessage(message);
  }

  private _postError(requestId: string, code: string, message: string): void {
    const errorMessage: ErrorMessage = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'ERROR',
      payload: { code, message, requestId },
    };
    this._postMessage(errorMessage);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.css')
    );

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
      <link href="${styleUri}" rel="stylesheet">
      <title>TaskScheduller</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
