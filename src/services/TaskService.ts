import type { DatabaseManager } from '../database/DatabaseManager';
import { TaskRepository, LabelRepository, DependencyRepository } from '../database/repositories';
import type {
  Task,
  Label,
  Dependency,
  CreateTaskDto,
  UpdateTaskDto,
  CreateLabelDto,
  CreateDependencyDto,
  TaskFilter,
  TaskStatus,
} from '../models/types';

export class TaskService {
  private taskRepo: TaskRepository;
  private labelRepo: LabelRepository;
  private dependencyRepo: DependencyRepository;

  constructor(private db: DatabaseManager) {
    this.taskRepo = new TaskRepository(db);
    this.labelRepo = new LabelRepository(db);
    this.dependencyRepo = new DependencyRepository(db);
  }

  // ============================================
  // Task operations
  // ============================================

  getAllTasks(filter?: TaskFilter): Task[] {
    const tasks = this.taskRepo.findAll(filter);
    return this.enrichTasksWithLabels(tasks);
  }

  getTaskById(id: string): Task | null {
    const task = this.taskRepo.findById(id);
    if (task) {
      return this.enrichTaskWithLabels(task);
    }
    return null;
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    const tasks = this.taskRepo.findByStatus(status);
    return this.enrichTasksWithLabels(tasks);
  }

  getSubtasks(parentId: string): Task[] {
    const tasks = this.taskRepo.findByParentId(parentId);
    return this.enrichTasksWithLabels(tasks);
  }

  getRootTasks(): Task[] {
    const tasks = this.taskRepo.findByParentId(null);
    return this.enrichTasksWithLabels(tasks);
  }

  createTask(dto: CreateTaskDto): Task {
    const task = this.taskRepo.create(dto);
    return this.enrichTaskWithLabels(task);
  }

  updateTask(id: string, dto: UpdateTaskDto): Task | null {
    const task = this.taskRepo.update(id, dto);
    if (task) {
      return this.enrichTaskWithLabels(task);
    }
    return null;
  }

  updateTaskStatus(id: string, status: TaskStatus): Task | null {
    const task = this.taskRepo.updateStatus(id, status);
    if (task) {
      return this.enrichTaskWithLabels(task);
    }
    return null;
  }

  deleteTask(id: string): boolean {
    // Delete associated dependencies first
    this.dependencyRepo.deleteByTask(id);
    return this.taskRepo.delete(id);
  }

  reorderTasks(taskIds: string[], status?: TaskStatus): void {
    this.taskRepo.reorder(taskIds, status);
  }

  // ============================================
  // Label operations
  // ============================================

  getAllLabels(): Label[] {
    return this.labelRepo.findAll();
  }

  getLabelById(id: string): Label | null {
    return this.labelRepo.findById(id);
  }

  createLabel(dto: CreateLabelDto): Label {
    return this.labelRepo.create(dto);
  }

  updateLabel(id: string, dto: Partial<CreateLabelDto>): Label | null {
    return this.labelRepo.update(id, dto);
  }

  deleteLabel(id: string): boolean {
    return this.labelRepo.delete(id);
  }

  // ============================================
  // Dependency operations
  // ============================================

  getAllDependencies(): Dependency[] {
    return this.dependencyRepo.findAll();
  }

  getDependenciesForTask(taskId: string): Dependency[] {
    return this.dependencyRepo.findByTask(taskId);
  }

  createDependency(dto: CreateDependencyDto): Dependency {
    return this.dependencyRepo.create(dto);
  }

  deleteDependency(id: string): boolean {
    return this.dependencyRepo.delete(id);
  }

  // ============================================
  // Helper methods
  // ============================================

  private enrichTaskWithLabels(task: Task): Task {
    const labelIds = this.taskRepo.getLabelsForTask(task.id);
    const labels = labelIds
      .map((id) => this.labelRepo.findById(id))
      .filter((l): l is Label => l !== null);
    return { ...task, labels };
  }

  private enrichTasksWithLabels(tasks: Task[]): Task[] {
    return tasks.map((task) => this.enrichTaskWithLabels(task));
  }

  // ============================================
  // Export operations
  // ============================================

  exportToJson(): string {
    const data = {
      tasks: this.getAllTasks(),
      labels: this.getAllLabels(),
      dependencies: this.getAllDependencies(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  exportToCsv(): string {
    const tasks = this.getAllTasks();
    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Due Date',
      'Start Date',
      'Assignee',
      'Estimated Hours',
      'Progress',
      'Labels',
      'Created At',
    ];

    const rows = tasks.map((task) => [
      task.id,
      `"${(task.title || '').replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      task.status,
      task.priority,
      task.dueDate || '',
      task.startDate || '',
      task.assignee || '',
      task.estimatedHours || '',
      task.progress,
      `"${(task.labels || []).map((l) => l.name).join(', ')}"`,
      task.createdAt,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  exportToMarkdown(): string {
    const tasks = this.getAllTasks();
    const lines: string[] = ['# Task List', '', `Exported: ${new Date().toISOString()}`, ''];

    const statusGroups: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const task of tasks) {
      statusGroups[task.status].push(task);
    }

    const statusLabels: Record<TaskStatus, string> = {
      todo: 'To Do',
      in_progress: 'In Progress',
      done: 'Done',
    };

    for (const [status, statusTasks] of Object.entries(statusGroups)) {
      if (statusTasks.length === 0) continue;

      lines.push(`## ${statusLabels[status as TaskStatus]}`, '');
      for (const task of statusTasks) {
        const checkbox = status === 'done' ? '[x]' : '[ ]';
        const priority = '●'.repeat(task.priority);
        const labels =
          task.labels && task.labels.length > 0
            ? ` [${task.labels.map((l) => l.name).join(', ')}]`
            : '';
        const dueDate = task.dueDate ? ` (Due: ${task.dueDate})` : '';

        lines.push(`- ${checkbox} ${priority} **${task.title}**${labels}${dueDate}`);
        if (task.description) {
          lines.push(`  > ${task.description}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
