// Re-export shared types from extension
// These types mirror the extension's models/types.ts

// Task Status - dynamic status supporting custom columns
export type TaskStatus = string;

// Default statuses for type guards
export const DEFAULT_STATUSES = ['todo', 'in_progress', 'on_hold', 'done'] as const;
export type DefaultTaskStatus = (typeof DEFAULT_STATUSES)[number];

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
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  assignee?: string | null;
  estimatedHours?: number | null;
  progress?: number;
  parentId?: string;
  labelIds?: string[];
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  progress?: number;
  sortOrder?: number;
}

export type ViewType = 'todo' | 'kanban' | 'gantt' | 'calendar';

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

// Map Tailwind bg-* classes to hex color values (for inline styles)
export const TAILWIND_COLOR_TO_HEX: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-yellow-500': '#eab308',
  'bg-green-500': '#22c55e',
  'bg-red-500': '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-cyan-500': '#06b6d4',
  'bg-orange-500': '#f97316',
  'bg-gray-500': '#6b7280',
};

// Helper function to get hex color from Tailwind class
export function getHexColor(tailwindClass: string): string {
  return TAILWIND_COLOR_TO_HEX[tailwindClass] || '#3b82f6'; // default to blue
}

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

// Filter types and utilities
export type { FilterCondition, FilterState } from './filter';
export {
  createEmptyFilterState,
  evaluateCondition,
  evaluateFilter,
  saveFilterState,
  loadFilterState,
} from './filter';
