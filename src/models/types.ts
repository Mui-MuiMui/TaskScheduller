// Task Status - dynamic status supporting custom columns
export type TaskStatus = string;

// Default statuses for type guards and initial setup
export const DEFAULT_STATUSES = ['todo', 'in_progress', 'on_hold', 'done'] as const;
export type DefaultTaskStatus = (typeof DEFAULT_STATUSES)[number];

// Priority: 1=Low, 2=Medium, 3=High, 4=Urgent
export type Priority = 1 | 2 | 3 | 4;

// Dependency types for Gantt chart
export type DependencyType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish'
  | 'start_to_finish';

// Project entity
export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string; // HEX color
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Aggregated data
  taskCount?: number;
}

// Task entity
export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null; // ISO 8601
  startDate: string | null; // ISO 8601
  assignee: string | null;
  estimatedHours: number | null;
  progress: number; // 0-100
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  labels?: Label[];
  subtasks?: Task[];
  dependencies?: Dependency[];
}

// Label entity
export interface Label {
  id: string;
  name: string;
  color: string; // HEX color
  createdAt: string;
}

// Dependency entity
export interface Dependency {
  id: string;
  predecessorId: string;
  successorId: string;
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: string;
  // Joined data
  predecessorTask?: Task;
  successorTask?: Task;
}

// DTOs for creating/updating
export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  sortOrder?: number;
}

export interface CreateTaskDto {
  projectId?: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  assignee?: string | null;
  estimatedHours?: number | null;
  parentId?: string;
  labelIds?: string[];
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  progress?: number;
  sortOrder?: number;
}

export interface CreateLabelDto {
  name: string;
  color: string;
}

export interface CreateDependencyDto {
  predecessorId: string;
  successorId: string;
  dependencyType?: DependencyType;
  lagDays?: number;
}

// KanbanColumn entity
export interface KanbanColumn {
  id: string;
  projectId: string | null; // null = global (all projects), string = project-specific
  name: string;
  color: string; // Tailwind color class (e.g., 'bg-blue-500')
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKanbanColumnDto {
  projectId?: string | null; // null or undefined = global
  name: string;
  color: string;
}

export interface UpdateKanbanColumnDto {
  name?: string;
  color?: string;
  sortOrder?: number;
}

// Preset colors for kanban columns
export const COLUMN_PRESET_COLORS = [
  { id: 'blue', class: 'bg-blue-500', label: 'Blue' },
  { id: 'yellow', class: 'bg-yellow-500', label: 'Yellow' },
  { id: 'green', class: 'bg-green-500', label: 'Green' },
  { id: 'red', class: 'bg-red-500', label: 'Red' },
  { id: 'purple', class: 'bg-purple-500', label: 'Purple' },
  { id: 'pink', class: 'bg-pink-500', label: 'Pink' },
  { id: 'indigo', class: 'bg-indigo-500', label: 'Indigo' },
  { id: 'cyan', class: 'bg-cyan-500', label: 'Cyan' },
  { id: 'orange', class: 'bg-orange-500', label: 'Orange' },
  { id: 'gray', class: 'bg-gray-500', label: 'Gray' },
] as const;

// Default kanban columns (for initial setup)
export const DEFAULT_KANBAN_COLUMNS: { id: DefaultTaskStatus; name: string; color: string }[] = [
  { id: 'todo', name: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', name: 'In Progress', color: 'bg-yellow-500' },
  { id: 'on_hold', name: 'On Hold', color: 'bg-gray-500' },
  { id: 'done', name: 'Done', color: 'bg-green-500' },
];

// Priority labels
export const PRIORITY_LABELS: Record<Priority, string> = {
  1: 'priority.low',
  2: 'priority.medium',
  3: 'priority.high',
  4: 'priority.urgent',
};

// Task filter
export interface TaskFilter {
  projectId?: string;
  status?: TaskStatus[];
  priority?: Priority[];
  labelIds?: string[];
  assignee?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  searchText?: string;
}

// Export/Import data structure
export interface ExportData {
  version: string;
  exportedAt: string;
  projects: Project[];
  tasks: Task[];
  labels: Label[];
  dependencies: Dependency[];
  taskLabels: { taskId: string; labelId: string }[];
  kanbanColumns: KanbanColumn[];
}

export interface ImportResult {
  success: boolean;
  imported?: {
    projects: number;
    tasks: number;
    labels: number;
    dependencies: number;
    columns: number;
  };
  error?: string;
}
