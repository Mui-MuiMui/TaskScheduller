import * as vscode from 'vscode';
import type { TaskSchedullerViewProvider } from '../providers/TaskSchedullerViewProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: TaskSchedullerViewProvider
) {
  // Open main view command
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.openMainView', () => {
      vscode.commands.executeCommand('workbench.view.extension.taskScheduller');
    })
  );

  // Create task command
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.createTask', () => {
      provider.sendCommand('CREATE_TASK_DIALOG');
    })
  );

  // Switch view commands
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToTodo', () => {
      provider.sendCommand('SWITCH_VIEW', { view: 'todo' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToKanban', () => {
      provider.sendCommand('SWITCH_VIEW', { view: 'kanban' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToGantt', () => {
      provider.sendCommand('SWITCH_VIEW', { view: 'gantt' });
    })
  );
}
