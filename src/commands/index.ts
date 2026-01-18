import * as vscode from 'vscode';
import type { TaskSchedullerPanelProvider } from '../providers/TaskSchedullerPanelProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: TaskSchedullerPanelProvider
) {
  // Open main view command (opens the panel)
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.openMainView', () => {
      provider.show();
    })
  );

  // Create task command
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.createTask', () => {
      provider.show();
      provider.sendCommand('CREATE_TASK_DIALOG');
    })
  );

  // Switch view commands
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToTodo', () => {
      provider.show();
      provider.sendCommand('SWITCH_VIEW', { view: 'todo' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToKanban', () => {
      provider.show();
      provider.sendCommand('SWITCH_VIEW', { view: 'kanban' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToGantt', () => {
      provider.show();
      provider.sendCommand('SWITCH_VIEW', { view: 'gantt' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.switchToCalendar', () => {
      provider.show();
      provider.sendCommand('SWITCH_VIEW', { view: 'calendar' });
    })
  );

  // Open specific project
  context.subscriptions.push(
    vscode.commands.registerCommand('taskScheduller.openProject', (projectId: string) => {
      provider.show(projectId);
    })
  );
}
