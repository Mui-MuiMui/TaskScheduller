// Re-export shared types from extension
// These types mirror the extension's models/types.ts

export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'done';
export type Priority = 1 | 2 | 3 | 4;
export type DependencyType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish'
  | 'start_to_finish';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}

export interface Task {
  projectId: string | null;
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  startDate: string | null;
  assignee: string | null;
  estimatedHours: number | null;
  progress: number;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  labels?: Label[];
  subtasks?: Task[];
  dependencies?: Dependency[];
}

export interface Label {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Dependency {
  id: string;
  predecessorId: string;
  successorId: string;
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: string;
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
  progress?: number;
  parentId?: string;
  labelIds?: string[];
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  progress?: number;
  sortOrder?: number;
}

export type ViewType = 'todo' | 'kanban' | 'gantt';

export const KANBAN_COLUMNS: { status: TaskStatus; labelKey: string }[] = [
  { status: 'todo', labelKey: 'status.todo' },
  { status: 'in_progress', labelKey: 'status.inProgress' },
  { status: 'on_hold', labelKey: 'status.onHold' },
  { status: 'done', labelKey: 'status.done' },
];

export const PRIORITY_LABEL_KEYS: Record<Priority, string> = {
  1: 'priority.low',
  2: 'priority.medium',
  3: 'priority.high',
  4: 'priority.urgent',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: 'text-blue-400',
  2: 'text-yellow-500',
  3: 'text-orange-500',
  4: 'text-red-500',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-blue-500',
  in_progress: 'text-yellow-500',
  on_hold: 'text-gray-500',
  done: 'text-green-500',
};
