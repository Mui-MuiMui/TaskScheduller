// Re-export shared types from extension
// These types mirror the extension's models/types.ts

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 1 | 2 | 3 | 4;
export type DependencyType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish'
  | 'start_to_finish';

export interface Task {
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

export type ViewType = 'todo' | 'kanban' | 'gantt';

export const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: 'text-blue-400',
  2: 'text-yellow-500',
  3: 'text-orange-500',
  4: 'text-red-500',
};
