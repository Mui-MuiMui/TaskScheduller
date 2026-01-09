import * as vscode from 'vscode';
import { DatabaseManager } from './database/DatabaseManager';
import { TaskSchedullerPanelProvider } from './providers/TaskSchedullerPanelProvider';
import { registerCommands } from './commands';

let databaseManager: DatabaseManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('TaskScheduller extension is now activating...');

  try {
    // Initialize database
    databaseManager = new DatabaseManager(context);
    await databaseManager.initialize();
    console.log('Database initialized successfully');

    // Create panel provider (singleton)
    const provider = TaskSchedullerPanelProvider.getInstance(
      context.extensionUri,
      databaseManager
    );

    // Register commands
    registerCommands(context, provider);

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
