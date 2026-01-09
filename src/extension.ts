import * as vscode from 'vscode';
import { DatabaseManager } from './database/DatabaseManager';
import { TaskSchedullerPanelProvider } from './providers/TaskSchedullerPanelProvider';
import { SidebarViewProvider } from './providers/SidebarViewProvider';
import { registerCommands } from './commands';

let databaseManager: DatabaseManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('TaskScheduller extension is now activating...');

  try {
    // Initialize database
    databaseManager = new DatabaseManager(context);
    await databaseManager.initialize();
    console.log('Database initialized successfully');

    // Create sidebar view provider with database access
    const sidebarProvider = new SidebarViewProvider(context.extensionUri, databaseManager);

    // Create panel provider (singleton)
    const panelProvider = TaskSchedullerPanelProvider.getInstance(
      context.extensionUri,
      databaseManager,
      sidebarProvider
    );

    // Register sidebar view provider
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SidebarViewProvider.viewType,
        sidebarProvider
      )
    );

    // Register commands
    registerCommands(context, panelProvider);

    console.log('TaskScheduller extension activated successfully');
  } catch (error) {
    console.error('Failed to activate TaskScheduller extension:', error);
    vscode.window.showErrorMessage(
      vscode.l10n.t('error.dbInit') + ': ' + (error as Error).message
    );
  }
}

export function deactivate() {
  console.log('TaskScheduller extension is deactivating...');
  if (databaseManager) {
    databaseManager.close();
  }
}
