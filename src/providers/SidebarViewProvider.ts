import * as vscode from 'vscode';
import type { DatabaseManager } from '../database/DatabaseManager';
import { ProjectRepository } from '../database/repositories/ProjectRepository';
import type { Project } from '../models/types';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'taskScheduller.sidebarView';

  private _view?: vscode.WebviewView;
  private _projectRepository?: ProjectRepository;
  private _databaseChangeSubscription?: vscode.Disposable;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _databaseManager?: DatabaseManager
  ) {
    // Subscribe to database changes from other windows
    if (this._databaseManager) {
      this._databaseChangeSubscription = this._databaseManager.onDatabaseChanged(() => {
        this._handleDatabaseChanged();
      });
    }
  }

  /**
   * Handles database changes triggered by external sources (e.g., other VSCode windows).
   * Reloads the project list.
   */
  private _handleDatabaseChanged(): void {
    console.log('Database changed externally, refreshing sidebar...');
    // Reset repository to force reload from new database state
    this._projectRepository = undefined;
    this._sendProjects();
  }

  /**
   * Disposes of the provider and cleans up resources.
   */
  public dispose(): void {
    this._databaseChangeSubscription?.dispose();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'openProject':
          vscode.commands.executeCommand('taskScheduller.openProject', message.projectId);
          break;
        case 'openMainView':
          vscode.commands.executeCommand('taskScheduller.openMainView');
          break;
        case 'createProject':
          this._createProject(message.name, message.description, message.color);
          break;
        case 'updateProject':
          this._updateProject(message.projectId, message.name, message.description, message.color);
          break;
        case 'deleteProject':
          this._deleteProject(message.projectId);
          break;
        case 'refreshProjects':
          this._sendProjects();
          break;
      }
    });

    // Send initial projects data
    this._sendProjects();
  }

  public refresh(): void {
    this._sendProjects();
  }

  private _getProjectRepository(): ProjectRepository | undefined {
    if (!this._databaseManager) return undefined;
    if (!this._projectRepository) {
      this._projectRepository = new ProjectRepository(this._databaseManager);
    }
    return this._projectRepository;
  }

  private _sendProjects(): void {
    if (!this._view) return;

    const repo = this._getProjectRepository();
    if (!repo) {
      // Fallback: show button to open main view if no DB access
      this._view.webview.postMessage({
        type: 'PROJECTS_LOADED',
        projects: [],
      });
      return;
    }

    try {
      const projects = repo.findAll();
      this._view.webview.postMessage({
        type: 'PROJECTS_LOADED',
        projects,
      });
      // Send translations after projects
      this._sendTranslations();
    } catch (error) {
      console.error('Failed to load projects:', error);
      this._view.webview.postMessage({
        type: 'PROJECTS_LOADED',
        projects: [],
      });
    }
  }

  private _sendTranslations(): void {
    if (!this._view) return;

    const translations = {
      'sidebar.projects': vscode.l10n.t('sidebar.projects'),
      'sidebar.openAllTasks': vscode.l10n.t('sidebar.openAllTasks'),
      'sidebar.projectName': vscode.l10n.t('sidebar.projectName'),
      'sidebar.projectNamePlaceholder': vscode.l10n.t('sidebar.projectNamePlaceholder'),
      'sidebar.projectDescription': vscode.l10n.t('sidebar.projectDescription'),
      'sidebar.projectDescriptionPlaceholder': vscode.l10n.t('sidebar.projectDescriptionPlaceholder'),
      'sidebar.projectColor': vscode.l10n.t('sidebar.projectColor'),
      'sidebar.noProjects': vscode.l10n.t('sidebar.noProjects'),
      'sidebar.noProjectsHint': vscode.l10n.t('sidebar.noProjectsHint'),
      'sidebar.tasks': vscode.l10n.t('sidebar.tasks'),
      'sidebar.cancel': vscode.l10n.t('sidebar.cancel'),
      'sidebar.create': vscode.l10n.t('sidebar.create'),
      'sidebar.save': vscode.l10n.t('sidebar.save'),
      'dialog.deleteProject': vscode.l10n.t('dialog.deleteProject'),
      'dialog.deleteProjectConfirm': vscode.l10n.t('dialog.deleteProjectConfirm'),
      'dialog.deleteProjectWarning': vscode.l10n.t('dialog.deleteProjectWarning'),
      'dialog.delete': vscode.l10n.t('dialog.delete'),
    };

    this._view.webview.postMessage({
      type: 'TRANSLATIONS_LOADED',
      translations,
    });
  }

  private _createProject(name: string, description: string, color: string): void {
    const repo = this._getProjectRepository();
    if (!repo) return;

    try {
      repo.create({ name, description, color });
      this._sendProjects();
      vscode.window.showInformationMessage(vscode.l10n.t('message.projectCreated', name));
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('error.createProjectFailed') + ': ' + (error as Error).message
      );
    }
  }

  private _updateProject(projectId: string, name: string, description: string, color: string): void {
    const repo = this._getProjectRepository();
    if (!repo) return;

    try {
      repo.update(projectId, { name, description, color });
      this._sendProjects();
      vscode.window.showInformationMessage(vscode.l10n.t('message.projectUpdated', name));
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('error.updateProjectFailed') + ': ' + (error as Error).message
      );
    }
  }

  private _deleteProject(projectId: string): void {
    const repo = this._getProjectRepository();
    if (!repo) return;

    try {
      const success = repo.delete(projectId);
      if (success) {
        this._sendProjects();
        vscode.window.showInformationMessage(vscode.l10n.t('message.projectDeleted'));
      } else {
        vscode.window.showWarningMessage(vscode.l10n.t('error.cannotDeleteDefaultProject'));
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('error.deleteProjectFailed') + ': ' + (error as Error).message
      );
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          padding: 12px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          font-size: 13px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--vscode-widget-border);
        }
        .header-title {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: var(--vscode-sideBarSectionHeader-foreground);
        }
        .add-button {
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .add-button:hover {
          background-color: var(--vscode-toolbar-hoverBackground);
        }
        .project-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .project-item {
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 4px;
          border-radius: 4px;
          cursor: pointer;
          gap: 8px;
        }
        .project-item:hover {
          background-color: var(--vscode-list-hoverBackground);
        }
        .project-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .project-info {
          flex: 1;
          min-width: 0;
        }
        .project-name {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .project-meta {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          margin-top: 2px;
        }
        .project-description {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .project-actions {
          opacity: 0;
          display: flex;
          gap: 4px;
        }
        .project-item:hover .project-actions {
          opacity: 1;
        }
        .action-button {
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          padding: 2px;
          border-radius: 3px;
          display: flex;
        }
        .action-button:hover {
          background-color: var(--vscode-toolbar-hoverBackground);
        }
        .action-button.delete:hover {
          color: var(--vscode-errorForeground);
        }
        .action-button.edit:hover {
          color: var(--vscode-textLink-foreground);
        }
        .empty-state {
          text-align: center;
          padding: 24px 16px;
          color: var(--vscode-descriptionForeground);
        }
        .open-all-button {
          width: 100%;
          padding: 10px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          margin-top: 12px;
        }
        .open-all-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }

        /* Create project form */
        .create-form {
          display: none;
          padding: 12px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-widget-border);
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .create-form.visible {
          display: block;
        }
        .form-group {
          margin-bottom: 10px;
        }
        .form-label {
          display: block;
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 4px;
        }
        .form-input {
          width: 100%;
          padding: 6px 8px;
          background-color: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          color: var(--vscode-input-foreground);
          border-radius: 4px;
          font-size: 13px;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
        }
        .color-picker {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .color-option {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
        }
        .color-option.selected {
          border-color: var(--vscode-focusBorder);
        }
        .form-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .form-button {
          flex: 1;
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .form-button.primary {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }
        .form-button.secondary {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }

        /* Delete confirmation dialog */
        .dialog-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        .dialog-overlay.visible {
          display: flex;
        }
        .dialog {
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-widget-border);
          border-radius: 8px;
          padding: 16px;
          max-width: 300px;
          width: 90%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .dialog-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          color: var(--vscode-foreground);
        }
        .dialog-message {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 16px;
          line-height: 1.4;
        }
        .dialog-warning {
          background-color: var(--vscode-inputValidation-warningBackground);
          border: 1px solid var(--vscode-inputValidation-warningBorder);
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 16px;
          font-size: 12px;
          color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
        }
        .dialog-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .dialog-button {
          padding: 6px 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .dialog-button.cancel {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
        .dialog-button.delete {
          background-color: #dc2626;
          color: white;
        }
        .dialog-button.delete:hover {
          background-color: #b91c1c;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <span class="header-title">Projects</span>
        <button class="add-button" onclick="toggleCreateForm()" title="Create Project">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
          </svg>
        </button>
      </div>

      <div id="projectForm" class="create-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" id="projectName" class="form-input" placeholder="Project name">
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <input type="text" id="projectDescription" class="form-input" placeholder="Description">
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <div class="color-picker" id="colorPicker">
            <div class="color-option selected" data-color="#3b82f6" style="background-color: #3b82f6"></div>
            <div class="color-option" data-color="#10b981" style="background-color: #10b981"></div>
            <div class="color-option" data-color="#f59e0b" style="background-color: #f59e0b"></div>
            <div class="color-option" data-color="#ef4444" style="background-color: #ef4444"></div>
            <div class="color-option" data-color="#8b5cf6" style="background-color: #8b5cf6"></div>
            <div class="color-option" data-color="#ec4899" style="background-color: #ec4899"></div>
            <div class="color-option" data-color="#6b7280" style="background-color: #6b7280"></div>
          </div>
        </div>
        <div class="form-buttons">
          <button class="form-button secondary" onclick="closeForm()">Cancel</button>
          <button class="form-button primary" id="formSubmitBtn" onclick="submitForm()">Create</button>
        </div>
      </div>

      <ul class="project-list" id="projectList">
        <li class="empty-state">Loading projects...</li>
      </ul>

      <button class="open-all-button" onclick="openMainView()">
        Open All Tasks
      </button>

      <!-- Delete confirmation dialog -->
      <div class="dialog-overlay" id="deleteDialog">
        <div class="dialog">
          <div class="dialog-title">Delete Project</div>
          <div class="dialog-message">
            Are you sure you want to delete "<span id="deleteProjectName"></span>"?
          </div>
          <div class="dialog-warning">
            ⚠️ This will permanently delete all tasks and custom columns associated with this project.
          </div>
          <div class="dialog-buttons">
            <button class="dialog-button cancel" onclick="closeDeleteDialog()">Cancel</button>
            <button class="dialog-button delete" onclick="confirmDelete()">Delete</button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        let projects = [];
        let selectedColor = '#3b82f6';
        let editingProjectId = null;
        let pendingDeleteProjectId = null;
        let translations = {};

        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'PROJECTS_LOADED') {
            projects = message.projects;
            renderProjects();
          } else if (message.type === 'TRANSLATIONS_LOADED') {
            translations = message.translations;
            applyTranslations();
          }
        });

        function t(key, ...args) {
          let text = translations[key] || key;
          // Replace {0}, {1}, etc. with arguments
          args.forEach((arg, index) => {
            text = text.replace(new RegExp('\\\\{' + index + '\\\\}', 'g'), arg);
          });
          return text;
        }

        function applyTranslations() {
          // Header
          const headerTitle = document.querySelector('.header-title');
          if (headerTitle) headerTitle.textContent = t('sidebar.projects');

          // Form labels
          const nameLabel = document.querySelector('#projectForm .form-group:nth-child(1) .form-label');
          if (nameLabel) nameLabel.textContent = t('sidebar.projectName');

          const descLabel = document.querySelector('#projectForm .form-group:nth-child(2) .form-label');
          if (descLabel) descLabel.textContent = t('sidebar.projectDescription');

          const colorLabel = document.querySelector('#projectForm .form-group:nth-child(3) .form-label');
          if (colorLabel) colorLabel.textContent = t('sidebar.projectColor');

          // Form inputs
          const nameInput = document.getElementById('projectName');
          if (nameInput) nameInput.placeholder = t('sidebar.projectNamePlaceholder');

          const descInput = document.getElementById('projectDescription');
          if (descInput) descInput.placeholder = t('sidebar.projectDescriptionPlaceholder');

          // Form buttons
          const cancelBtn = document.querySelector('.form-button.secondary');
          if (cancelBtn) cancelBtn.textContent = t('sidebar.cancel');

          // Open all button
          const openAllBtn = document.querySelector('.open-all-button');
          if (openAllBtn) openAllBtn.textContent = t('sidebar.openAllTasks');

          // Delete dialog
          const dialogTitle = document.querySelector('.dialog-title');
          if (dialogTitle) dialogTitle.textContent = t('dialog.deleteProject');

          const dialogWarning = document.querySelector('.dialog-warning');
          if (dialogWarning) dialogWarning.innerHTML = '⚠️ ' + t('dialog.deleteProjectWarning');

          const dialogCancelBtn = document.querySelector('.dialog-button.cancel');
          if (dialogCancelBtn) dialogCancelBtn.textContent = t('sidebar.cancel');

          const dialogDeleteBtn = document.querySelector('.dialog-button.delete');
          if (dialogDeleteBtn) dialogDeleteBtn.textContent = t('dialog.delete');

          // Re-render projects with translations
          renderProjects();
        }

        function renderProjects() {
          const list = document.getElementById('projectList');

          if (projects.length === 0) {
            const noProjects = t('sidebar.noProjects') || 'No projects yet.';
            const hint = t('sidebar.noProjectsHint') || 'Create one to get started!';
            list.innerHTML = \`<li class="empty-state">\${noProjects}<br>\${hint}</li>\`;
            return;
          }

          const tasksLabel = t('sidebar.tasks') || 'tasks';
          list.innerHTML = projects.map(project => \`
            <li class="project-item" onclick="openProject('\${project.id}')">
              <div class="project-color" style="background-color: \${project.color}"></div>
              <div class="project-info">
                <div class="project-name">\${escapeHtml(project.name)}</div>
                \${project.description ? \`<div class="project-description">\${escapeHtml(project.description)}</div>\` : ''}
                <div class="project-meta">\${project.taskCount || 0} \${tasksLabel}</div>
              </div>
              <div class="project-actions">
                <button class="action-button edit" onclick="event.stopPropagation(); editProject('\${project.id}')" title="Edit">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3.42 1.9 1.91-3.41 1.51zm3.92-2.16L4.57 9.67l6.43-6.44 1.77 1.77-6.44 6.43z"/>
                  </svg>
                </button>
                \${project.id !== 'default-project' ? \`
                  <button class="action-button delete" onclick="event.stopPropagation(); deleteProject('\${project.id}')" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z"/>
                    </svg>
                  </button>
                \` : ''}
              </div>
            </li>
          \`).join('');
        }

        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        function openProject(projectId) {
          vscode.postMessage({ command: 'openProject', projectId });
        }

        function openMainView() {
          vscode.postMessage({ command: 'openMainView' });
        }

        function toggleCreateForm() {
          editingProjectId = null;
          document.getElementById('formSubmitBtn').textContent = t('sidebar.create') || 'Create';
          showForm();
        }

        function editProject(projectId) {
          const project = projects.find(p => p.id === projectId);
          if (!project) return;

          editingProjectId = projectId;
          document.getElementById('projectName').value = project.name;
          document.getElementById('projectDescription').value = project.description || '';
          selectedColor = project.color;
          updateColorSelection();
          document.getElementById('formSubmitBtn').textContent = t('sidebar.save') || 'Save';
          showForm();
        }

        function showForm() {
          const form = document.getElementById('projectForm');
          form.classList.add('visible');
          document.getElementById('projectName').focus();
        }

        function closeForm() {
          const form = document.getElementById('projectForm');
          form.classList.remove('visible');
          // Reset form
          document.getElementById('projectName').value = '';
          document.getElementById('projectDescription').value = '';
          selectedColor = '#3b82f6';
          updateColorSelection();
          editingProjectId = null;
        }

        function submitForm() {
          const name = document.getElementById('projectName').value.trim();
          const description = document.getElementById('projectDescription').value.trim();

          if (!name) {
            return;
          }

          if (editingProjectId) {
            vscode.postMessage({
              command: 'updateProject',
              projectId: editingProjectId,
              name,
              description,
              color: selectedColor
            });
          } else {
            vscode.postMessage({
              command: 'createProject',
              name,
              description,
              color: selectedColor
            });
          }

          closeForm();
        }

        function deleteProject(projectId) {
          const project = projects.find(p => p.id === projectId);
          if (!project) return;

          pendingDeleteProjectId = projectId;
          document.getElementById('deleteProjectName').textContent = project.name;
          // Update dialog message with translated confirmation text
          const dialogMessage = document.querySelector('.dialog-message');
          if (dialogMessage) {
            const confirmText = t('dialog.deleteProjectConfirm', project.name);
            dialogMessage.innerHTML = confirmText;
          }
          document.getElementById('deleteDialog').classList.add('visible');
        }

        function closeDeleteDialog() {
          document.getElementById('deleteDialog').classList.remove('visible');
          pendingDeleteProjectId = null;
        }

        function confirmDelete() {
          if (pendingDeleteProjectId) {
            vscode.postMessage({ command: 'deleteProject', projectId: pendingDeleteProjectId });
            closeDeleteDialog();
          }
        }

        // Color picker
        document.getElementById('colorPicker').addEventListener('click', (e) => {
          const option = e.target.closest('.color-option');
          if (option) {
            selectedColor = option.dataset.color;
            updateColorSelection();
          }
        });

        function updateColorSelection() {
          document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.color === selectedColor);
          });
        }

        // Request initial data
        vscode.postMessage({ command: 'refreshProjects' });
      </script>
    </body>
    </html>`;
  }
}
