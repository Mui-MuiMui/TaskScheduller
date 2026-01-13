import * as vscode from 'vscode';
import type { DatabaseManager } from '../database/DatabaseManager';
import { TaskService } from '../services/TaskService';
import type { SidebarViewProvider } from './SidebarViewProvider';
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
  DataImportedMessage,
  ErrorMessage,
  KanbanColumnsLoadedMessage,
  KanbanColumnCreatedMessage,
  KanbanColumnUpdatedMessage,
  KanbanColumnDeletedMessage,
  KanbanColumnsReorderedMessage,
} from '../models/messages';
import type { TaskFilter, CreateKanbanColumnDto, UpdateKanbanColumnDto } from '../models/types';

export class TaskSchedullerPanelProvider {
  public static readonly viewType = 'taskScheduller.mainPanel';

  private static _instance: TaskSchedullerPanelProvider | undefined;
  private static _sidebarProvider?: SidebarViewProvider;
  private _panel?: vscode.WebviewPanel;
  private _taskService: TaskService;
  private _disposables: vscode.Disposable[] = [];
  private _currentProjectId?: string;
  private _databaseChangeSubscription?: vscode.Disposable;

  private constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _databaseManager: DatabaseManager
  ) {
    this._taskService = new TaskService(_databaseManager);

    // Subscribe to database changes from other windows
    this._databaseChangeSubscription = this._databaseManager.onDatabaseChanged(() => {
      this._handleDatabaseChanged();
    });
  }

  /**
   * Handles database changes triggered by external sources (e.g., other VSCode windows).
   * Reloads all data and updates the UI.
   */
  private _handleDatabaseChanged(): void {
    console.log('Database changed externally, refreshing UI...');

    // Reload data in the panel if it's open
    if (this._panel) {
      const filter = this._currentProjectId ? { projectId: this._currentProjectId } : undefined;
      this._loadTasks(crypto.randomUUID(), filter);
      this._loadKanbanColumns(crypto.randomUUID(), this._currentProjectId);
    }

    // Refresh the sidebar
    this._refreshSidebar();
  }

  public static getInstance(
    extensionUri: vscode.Uri,
    databaseManager: DatabaseManager,
    sidebarProvider?: SidebarViewProvider
  ): TaskSchedullerPanelProvider {
    if (sidebarProvider) {
      TaskSchedullerPanelProvider._sidebarProvider = sidebarProvider;
    }
    if (!TaskSchedullerPanelProvider._instance) {
      TaskSchedullerPanelProvider._instance = new TaskSchedullerPanelProvider(
        extensionUri,
        databaseManager
      );
    }
    return TaskSchedullerPanelProvider._instance;
  }

  private _refreshSidebar(): void {
    TaskSchedullerPanelProvider._sidebarProvider?.refresh();
  }

  public show(projectId?: string): void {
    const previousProjectId = this._currentProjectId;
    this._currentProjectId = projectId;

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel exists, show it and update project
    if (this._panel) {
      this._panel.reveal(column);
      // Send project change to webview (even if undefined, to show all tasks)
      if (projectId !== previousProjectId) {
        this.sendCommand('SET_PROJECT', { projectId: projectId || null });
        // Reload tasks for new filter
        this._loadTasks(crypto.randomUUID(), projectId ? { projectId } : undefined);
        // Reload kanban columns for new project (global + project-specific)
        this._loadKanbanColumns(crypto.randomUUID(), projectId);
      }
      return;
    }

    // Create new panel
    this._panel = vscode.window.createWebviewPanel(
      TaskSchedullerPanelProvider.viewType,
      'TaskScheduller',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(this._extensionUri, 'resources'),
        ],
      }
    );

    this._panel.iconPath = vscode.Uri.joinPath(
      this._extensionUri,
      'resources',
      'icons',
      'task.svg'
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    // Handle panel disposal
    this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

    // Listen for theme changes
    vscode.window.onDidChangeActiveColorTheme(
      () => this._sendConfig(),
      null,
      this._disposables
    );
  }

  public sendCommand(command: string, payload?: unknown): void {
    if (this._panel) {
      this._panel.webview.postMessage({
        type: 'COMMAND',
        command,
        payload,
      });
    }
  }

  private _dispose(): void {
    this._panel = undefined;
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  /**
   * Disposes of the provider and cleans up resources.
   * Should be called when the extension is deactivated.
   */
  public dispose(): void {
    this._databaseChangeSubscription?.dispose();
    this._dispose();
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

        case 'IMPORT_DATA':
          await this._importData(message.id);
          break;

        case 'LOAD_KANBAN_COLUMNS':
          await this._loadKanbanColumns(message.id);
          break;

        case 'CREATE_KANBAN_COLUMN':
          await this._createKanbanColumn(message.id, message.payload);
          break;

        case 'UPDATE_KANBAN_COLUMN':
          await this._updateKanbanColumn(message.id, message.payload.columnId, message.payload.updates);
          break;

        case 'DELETE_KANBAN_COLUMN':
          await this._deleteKanbanColumn(message.id, message.payload.columnId, message.payload.targetColumnId);
          break;

        case 'REORDER_KANBAN_COLUMNS':
          await this._reorderKanbanColumns(message.id, message.payload.columnIds, message.payload.projectId);
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
    // If a project is selected, filter by project
    const filter = this._currentProjectId ? { projectId: this._currentProjectId } : undefined;
    await this._loadTasks(requestId, filter);
    // Load kanban columns
    await this._loadKanbanColumns(crypto.randomUUID());
    // Also send current project info
    if (this._currentProjectId) {
      this.sendCommand('SET_PROJECT', { projectId: this._currentProjectId });
    }
  }

  private _sendConfig(): void {
    const config = vscode.workspace.getConfiguration('taskScheduller');
    const defaultView = config.get<'todo' | 'kanban' | 'gantt'>('defaultView', 'kanban');

    this._postMessage({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'CONFIG_CHANGED',
      payload: {
        locale: vscode.env.language,
        theme: this._getTheme(),
        defaultView,
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
    filter?: TaskFilter
  ): Promise<void> {
    const tasks = this._taskService.getAllTasks(filter);
    const labels = this._taskService.getAllLabels();
    const dependencies = this._taskService.getAllDependencies();
    const projects = this._taskService.getAllProjects();

    const message: TasksLoadedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'TASKS_LOADED',
      payload: { tasks, labels, dependencies, projects },
    };
    this._postMessage(message);
  }

  private async _createTask(
    requestId: string,
    payload: WebviewToExtensionMessage extends { type: 'CREATE_TASK'; payload: infer P }
      ? P
      : never
  ): Promise<void> {
    // predecessorIdsを取り出す
    const { predecessorIds, ...taskPayload } = payload as typeof payload & { predecessorIds?: string[] };

    // ペイロードにprojectIdがあればそれを使用、なければ現在のプロジェクトIDを使用
    const projectId = taskPayload.projectId || this._currentProjectId;
    const taskData = projectId
      ? { ...taskPayload, projectId }
      : taskPayload;
    const task = this._taskService.createTask(taskData);

    // まずタスク作成を通知
    const message: TaskCreatedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'TASK_CREATED',
      payload: { task },
    };
    this._postMessage(message);

    // 先行タスクの依存関係を作成し、各依存関係を個別に通知
    if (predecessorIds && predecessorIds.length > 0) {
      for (const predecessorId of predecessorIds) {
        const dependency = this._taskService.createDependency({
          predecessorId: predecessorId,
          successorId: task.id,
        });
        // 依存関係作成を個別に通知
        const depMessage: DependencyCreatedMessage = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'DEPENDENCY_CREATED',
          payload: { dependency },
        };
        this._postMessage(depMessage);
      }
    }

    this._refreshSidebar();

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
      this._refreshSidebar();

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
    // Reload tasks after reorder with current project filter
    const filter = this._currentProjectId ? { projectId: this._currentProjectId } : undefined;
    await this._loadTasks(requestId, filter);
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

  private async _exportData(format: 'json' | 'csv'): Promise<void> {
    let content: string;
    let defaultExt: string;
    const filters: { [key: string]: string[] } = {};

    switch (format) {
      case 'json':
        content = this._taskService.exportToJson();
        defaultExt = 'json';
        filters['JSON'] = ['json'];
        break;
      case 'csv':
        content = this._taskService.exportToCsv();
        defaultExt = 'csv';
        filters['CSV'] = ['csv'];
        break;
    }

    // ローカル時間でタイムスタンプを生成
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const defaultFilename = `taskscheduller_export_${timestamp}.${defaultExt}`;

    const uri = await vscode.window.showSaveDialog({
      filters,
      defaultUri: vscode.Uri.file(defaultFilename),
      title: vscode.l10n.t('dialog.exportData'),
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
      vscode.window.showInformationMessage(vscode.l10n.t('message.dataExported'));
    }
  }

  private async _importData(requestId: string): Promise<void> {
    const files = await vscode.window.showOpenDialog({
      filters: { 'JSON': ['json'] },
      canSelectMany: false,
      title: vscode.l10n.t('dialog.importData'),
    });

    if (!files || files.length === 0) {
      return;
    }

    try {
      const content = await vscode.workspace.fs.readFile(files[0]);
      const jsonString = Buffer.from(content).toString('utf-8');
      const result = this._taskService.importFromJson(jsonString);

      const message: DataImportedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'DATA_IMPORTED',
        payload: result,
      };
      this._postMessage(message);

      if (result.success) {
        vscode.window.showInformationMessage(
          vscode.l10n.t(
            'message.dataImported',
            result.imported?.projects ?? 0,
            result.imported?.tasks ?? 0,
            result.imported?.labels ?? 0,
            result.imported?.dependencies ?? 0
          )
        );
        // Reload tasks and columns to reflect imported data
        await this._loadTasks(crypto.randomUUID());
        await this._loadKanbanColumns(crypto.randomUUID());
        this._refreshSidebar();
      } else {
        vscode.window.showErrorMessage(
          vscode.l10n.t('message.importFailed', result.error ?? 'Unknown error')
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('message.importFailed', (error as Error).message)
      );
    }
  }

  // ============================================
  // Kanban Column operations
  // ============================================

  private async _loadKanbanColumns(requestId: string, projectId?: string | null): Promise<void> {
    // Pass projectId to get global columns + project-specific columns
    const columns = this._taskService.getAllKanbanColumns(projectId ?? this._currentProjectId);
    const message: KanbanColumnsLoadedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'KANBAN_COLUMNS_LOADED',
      payload: { columns },
    };
    this._postMessage(message);
  }

  private async _createKanbanColumn(
    requestId: string,
    payload: CreateKanbanColumnDto
  ): Promise<void> {
    // Pass current project ID so the column is added at the end of this project's view
    const column = this._taskService.createKanbanColumn(payload, this._currentProjectId);
    const message: KanbanColumnCreatedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'KANBAN_COLUMN_CREATED',
      payload: { column },
    };
    this._postMessage(message);
  }

  private async _updateKanbanColumn(
    requestId: string,
    columnId: string,
    updates: UpdateKanbanColumnDto
  ): Promise<void> {
    const column = this._taskService.updateKanbanColumn(columnId, updates);
    if (column) {
      const message: KanbanColumnUpdatedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'KANBAN_COLUMN_UPDATED',
        payload: { column },
      };
      this._postMessage(message);
    } else {
      this._postError(requestId, 'COLUMN_NOT_FOUND', 'Column not found');
    }
  }

  private async _deleteKanbanColumn(
    requestId: string,
    columnId: string,
    targetColumnId?: string
  ): Promise<void> {
    let result;
    if (targetColumnId) {
      result = this._taskService.deleteKanbanColumnWithMigration(columnId, targetColumnId);
    } else {
      result = this._taskService.deleteKanbanColumn(columnId);
    }

    if (result.success) {
      const message: KanbanColumnDeletedMessage = {
        id: requestId,
        timestamp: Date.now(),
        type: 'KANBAN_COLUMN_DELETED',
        payload: { columnId },
      };
      this._postMessage(message);

      // If tasks were migrated, reload tasks
      if (targetColumnId) {
        const filter = this._currentProjectId ? { projectId: this._currentProjectId } : undefined;
        await this._loadTasks(crypto.randomUUID(), filter);
      }
    } else {
      this._postError(requestId, 'DELETE_FAILED', result.error || 'Delete failed');
    }
  }

  private async _reorderKanbanColumns(requestId: string, columnIds: string[], projectId?: string | null): Promise<void> {
    // Use projectId from payload (null for "All Tasks" view, or specific project ID)
    // Fall back to _currentProjectId if not provided
    const effectiveProjectId = projectId !== undefined ? projectId : this._currentProjectId;
    this._taskService.reorderKanbanColumns(columnIds, effectiveProjectId);
    // Reload columns with the updated order
    const columns = this._taskService.getAllKanbanColumns(effectiveProjectId);
    const message: KanbanColumnsReorderedMessage = {
      id: requestId,
      timestamp: Date.now(),
      type: 'KANBAN_COLUMNS_REORDERED',
      payload: { columns },
    };
    this._postMessage(message);
  }

  private _postMessage(message: ExtensionToWebviewMessage): void {
    this._panel?.webview.postMessage(message);
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
