import type { DatabaseManager } from '../database/DatabaseManager';
import {
  TaskRepository,
  LabelRepository,
  DependencyRepository,
  ProjectRepository,
} from '../database/repositories';
import { KanbanColumnRepository } from '../database/repositories/KanbanColumnRepository';
import type {
  Task,
  Label,
  Dependency,
  Project,
  KanbanColumn,
  CreateTaskDto,
  UpdateTaskDto,
  CreateLabelDto,
  CreateDependencyDto,
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
  TaskFilter,
  TaskStatus,
  ExportData,
  ImportResult,
} from '../models/types';

export type { Project };

export class TaskService {
  private taskRepo: TaskRepository;
  private labelRepo: LabelRepository;
  private dependencyRepo: DependencyRepository;
  private projectRepo: ProjectRepository;
  private kanbanColumnRepo: KanbanColumnRepository;

  constructor(private db: DatabaseManager) {
    this.taskRepo = new TaskRepository(db);
    this.labelRepo = new LabelRepository(db);
    this.dependencyRepo = new DependencyRepository(db);
    this.projectRepo = new ProjectRepository(db);
    this.kanbanColumnRepo = new KanbanColumnRepository(db);
  }

  // ============================================
  // Project operations
  // ============================================

  getAllProjects(): Project[] {
    return this.projectRepo.findAll();
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
    // Check if the target column is project-specific
    const targetColumn = this.kanbanColumnRepo.findById(status);

    let task;
    if (targetColumn?.projectId) {
      // If moving to a project-specific column, also update the task's project
      task = this.taskRepo.updateStatus(id, status);
      if (task) {
        task = this.taskRepo.update(id, { projectId: targetColumn.projectId });
      }
    } else {
      // Regular status update (global column)
      task = this.taskRepo.updateStatus(id, status);
    }

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
  // Kanban Column operations
  // ============================================

  getAllKanbanColumns(projectId?: string | null): KanbanColumn[] {
    return this.kanbanColumnRepo.findAll(projectId);
  }

  getAllKanbanColumnsForExport(): KanbanColumn[] {
    return this.kanbanColumnRepo.findAllForExport();
  }

  getKanbanColumnById(id: string): KanbanColumn | null {
    return this.kanbanColumnRepo.findById(id);
  }

  createKanbanColumn(dto: CreateKanbanColumnDto, forProjectId?: string | null): KanbanColumn {
    return this.kanbanColumnRepo.create(dto, forProjectId);
  }

  updateKanbanColumn(id: string, dto: UpdateKanbanColumnDto): KanbanColumn | null {
    return this.kanbanColumnRepo.update(id, dto);
  }

  deleteKanbanColumn(id: string): { success: boolean; error?: string } {
    return this.kanbanColumnRepo.delete(id);
  }

  deleteKanbanColumnWithMigration(
    id: string,
    targetColumnId: string
  ): { success: boolean; error?: string } {
    return this.kanbanColumnRepo.deleteWithMigration(id, targetColumnId);
  }

  reorderKanbanColumns(columnIds: string[], projectId?: string | null): void {
    this.kanbanColumnRepo.reorder(columnIds, projectId);
  }

  getTaskCountByColumn(columnId: string): number {
    return this.kanbanColumnRepo.getTaskCountByColumn(columnId);
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
  // Export/Import operations
  // ============================================

  exportToJson(): string {
    const projects = this.projectRepo.findAll();
    const tasks = this.getAllTasks();
    const labels = this.getAllLabels();
    const dependencies = this.getAllDependencies();
    const kanbanColumns = this.getAllKanbanColumnsForExport();

    // Get task-label relationships
    const taskLabels: { taskId: string; labelId: string }[] = [];
    for (const task of tasks) {
      const labelIds = this.taskRepo.getLabelsForTask(task.id);
      for (const labelId of labelIds) {
        taskLabels.push({ taskId: task.id, labelId });
      }
    }

    const data: ExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      projects,
      tasks,
      labels,
      dependencies,
      taskLabels,
      kanbanColumns,
    };
    return JSON.stringify(data, null, 2);
  }

  importFromJson(jsonString: string): ImportResult {
    try {
      const data = JSON.parse(jsonString) as ExportData;

      // Validate version
      if (!data.version || !data.tasks || !data.labels || !data.dependencies) {
        return { success: false, error: 'Invalid export data format' };
      }

      // ID mapping: oldId -> newId
      const projectIdMap = new Map<string, string>();
      const labelIdMap = new Map<string, string>();
      const taskIdMap = new Map<string, string>();
      const columnIdMap = new Map<string, string>();

      let projectsImported = 0;
      let labelsImported = 0;
      let tasksImported = 0;
      let dependenciesImported = 0;
      let columnsImported = 0;

      this.db.transaction(() => {
        // 0. Import projects (skip default-project and duplicates by name)
        if (data.projects) {
          for (const project of data.projects) {
            // Skip default project - map to existing default
            if (project.id === 'default-project') {
              projectIdMap.set(project.id, 'default-project');
              continue;
            }

            // Check if project with same name exists
            const existingProjects = this.projectRepo.findAll();
            const existingByName = existingProjects.find(p => p.name === project.name);
            if (existingByName) {
              projectIdMap.set(project.id, existingByName.id);
            } else {
              const newProject = this.projectRepo.create({
                name: project.name,
                description: project.description ?? undefined,
                color: project.color,
              });
              projectIdMap.set(project.id, newProject.id);
              projectsImported++;
            }
          }
        }

        // 1. Import kanban columns BEFORE tasks (task status references column IDs)
        if (data.kanbanColumns) {
          for (const column of data.kanbanColumns) {
            // Check if column with same ID already exists (default columns like 'todo', 'in_progress', etc.)
            const existingColumn = this.kanbanColumnRepo.findById(column.id);
            if (existingColumn) {
              // Map to existing column ID
              columnIdMap.set(column.id, column.id);
              continue;
            }

            // Map project ID if it's project-specific
            let newProjectId: string | null = null;
            if (column.projectId) {
              const mappedProjectId = projectIdMap.get(column.projectId);
              if (mappedProjectId) {
                newProjectId = mappedProjectId;
              } else {
                // Project not found in map - skip this project-specific column
                // (the project was not in the export data or failed to import)
                continue;
              }
            }

            const newColumn = this.kanbanColumnRepo.create({
              projectId: newProjectId,
              name: column.name,
              color: column.color,
            });
            columnIdMap.set(column.id, newColumn.id);
            columnsImported++;
          }
        }

        // 2. Import labels (skip duplicates by name)
        for (const label of data.labels) {
          const existing = this.labelRepo.findByName(label.name);
          if (existing) {
            labelIdMap.set(label.id, existing.id);
          } else {
            const newLabel = this.labelRepo.create({
              name: label.name,
              color: label.color,
            });
            labelIdMap.set(label.id, newLabel.id);
            labelsImported++;
          }
        }

        // 3. Import tasks (2 passes for parent-child relationships)
        // Pass 1: Tasks without parent
        for (const task of data.tasks) {
          if (!task.parentId) {
            // Map project ID and status (column ID)
            const newProjectId = task.projectId ? projectIdMap.get(task.projectId) : undefined;
            // Map status to new column ID, fallback to original if mapping not found (for default columns)
            const newStatus = columnIdMap.get(task.status) || task.status;
            const newTask = this.taskRepo.create({
              projectId: newProjectId ?? 'default-project',
              title: task.title,
              description: task.description ?? undefined,
              status: newStatus,
              priority: task.priority,
              dueDate: task.dueDate ?? undefined,
              startDate: task.startDate ?? undefined,
              assignee: task.assignee ?? undefined,
              estimatedHours: task.estimatedHours ?? undefined,
            });
            // Update progress after creation
            if (task.progress > 0) {
              this.taskRepo.update(newTask.id, { progress: task.progress });
            }
            taskIdMap.set(task.id, newTask.id);
            tasksImported++;
          }
        }

        // Pass 2: Tasks with parent
        for (const task of data.tasks) {
          if (task.parentId) {
            const newParentId = taskIdMap.get(task.parentId);
            const newProjectId = task.projectId ? projectIdMap.get(task.projectId) : undefined;
            // Map status to new column ID, fallback to original if mapping not found
            const newStatus = columnIdMap.get(task.status) || task.status;
            const newTask = this.taskRepo.create({
              projectId: newProjectId ?? 'default-project',
              title: task.title,
              description: task.description ?? undefined,
              status: newStatus,
              priority: task.priority,
              dueDate: task.dueDate ?? undefined,
              startDate: task.startDate ?? undefined,
              assignee: task.assignee ?? undefined,
              estimatedHours: task.estimatedHours ?? undefined,
              parentId: newParentId,
            });
            if (task.progress > 0) {
              this.taskRepo.update(newTask.id, { progress: task.progress });
            }
            taskIdMap.set(task.id, newTask.id);
            tasksImported++;
          }
        }

        // 4. Import task-label relationships
        if (data.taskLabels) {
          for (const tl of data.taskLabels) {
            const newTaskId = taskIdMap.get(tl.taskId);
            const newLabelId = labelIdMap.get(tl.labelId);
            if (newTaskId && newLabelId) {
              this.db.execute(
                'INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)',
                [newTaskId, newLabelId]
              );
            }
          }
        }

        // 5. Import dependencies
        for (const dep of data.dependencies) {
          const newPredecessorId = taskIdMap.get(dep.predecessorId);
          const newSuccessorId = taskIdMap.get(dep.successorId);
          if (newPredecessorId && newSuccessorId) {
            this.dependencyRepo.create({
              predecessorId: newPredecessorId,
              successorId: newSuccessorId,
              dependencyType: dep.dependencyType,
              lagDays: dep.lagDays,
            });
            dependenciesImported++;
          }
        }
      });

      return {
        success: true,
        imported: {
          projects: projectsImported,
          tasks: tasksImported,
          labels: labelsImported,
          dependencies: dependenciesImported,
          columns: columnsImported,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during import',
      };
    }
  }

  exportToCsv(): string {
    const tasks = this.getAllTasks();
    const projects = this.projectRepo.findAll();
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    const headers = [
      'ID',
      'Project',
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
      `"${(projectMap.get(task.projectId) || '').replace(/"/g, '""')}"`,
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
}
