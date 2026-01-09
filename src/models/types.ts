// Task Status
export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'done';

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
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
  startDate?: string;
  assignee?: string;
  estimatedHours?: number;
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

// Kanban column mapping
export const KANBAN_COLUMNS: { status: TaskStatus; labelKey: string }[] = [
  { status: 'todo', labelKey: 'status.todo' },
  { status: 'in_progress', labelKey: 'status.inProgress' },
  { status: 'on_hold', labelKey: 'status.onHold' },
  { status: 'done', labelKey: 'status.done' },
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
