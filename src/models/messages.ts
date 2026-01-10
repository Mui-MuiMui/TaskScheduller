import type {
  Task,
  Label,
  Dependency,
  Project,
  CreateTaskDto,
  UpdateTaskDto,
  CreateLabelDto,
  CreateDependencyDto,
  TaskFilter,
  TaskStatus,
} from './types';

// Base message interface
export interface BaseMessage {
  id: string;
  timestamp: number;
}

// ============================================
// Extension Host -> Webview Messages
// ============================================

export type ExtensionToWebviewMessage =
  | TasksLoadedMessage
  | TaskCreatedMessage
  | TaskUpdatedMessage
  | TaskDeletedMessage
  | LabelsLoadedMessage
  | LabelCreatedMessage
  | DependencyCreatedMessage
  | DependencyDeletedMessage
  | DataImportedMessage
  | ErrorMessage
  | ConfigChangedMessage;

export interface TasksLoadedMessage extends BaseMessage {
  type: 'TASKS_LOADED';
  payload: {
    tasks: Task[];
    labels: Label[];
    dependencies: Dependency[];
    projects: Project[];
  };
}

export interface TaskCreatedMessage extends BaseMessage {
  type: 'TASK_CREATED';
  payload: { task: Task };
}

export interface TaskUpdatedMessage extends BaseMessage {
  type: 'TASK_UPDATED';
  payload: { task: Task };
}

export interface TaskDeletedMessage extends BaseMessage {
  type: 'TASK_DELETED';
  payload: { taskId: string };
}

export interface LabelsLoadedMessage extends BaseMessage {
  type: 'LABELS_LOADED';
  payload: { labels: Label[] };
}

export interface LabelCreatedMessage extends BaseMessage {
  type: 'LABEL_CREATED';
  payload: { label: Label };
}

export interface DependencyCreatedMessage extends BaseMessage {
  type: 'DEPENDENCY_CREATED';
  payload: { dependency: Dependency };
}

export interface DependencyDeletedMessage extends BaseMessage {
  type: 'DEPENDENCY_DELETED';
  payload: { dependencyId: string };
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  payload: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface ConfigChangedMessage extends BaseMessage {
  type: 'CONFIG_CHANGED';
  payload: {
    locale: string;
    theme: 'light' | 'dark' | 'high-contrast';
    defaultView: 'todo' | 'kanban' | 'gantt';
  };
}

export interface DataImportedMessage extends BaseMessage {
  type: 'DATA_IMPORTED';
  payload: {
    success: boolean;
    imported?: {
      projects: number;
      tasks: number;
      labels: number;
      dependencies: number;
    };
    error?: string;
  };
}

// ============================================
// Webview -> Extension Host Messages
// ============================================

export type WebviewToExtensionMessage =
  | LoadTasksRequest
  | CreateTaskRequest
  | UpdateTaskRequest
  | DeleteTaskRequest
  | UpdateTaskStatusRequest
  | ReorderTasksRequest
  | LoadLabelsRequest
  | CreateLabelRequest
  | DeleteLabelRequest
  | CreateDependencyRequest
  | DeleteDependencyRequest
  | ExportDataRequest
  | ImportDataRequest
  | WebviewReadyMessage;

export interface LoadTasksRequest extends BaseMessage {
  type: 'LOAD_TASKS';
  payload?: {
    filter?: TaskFilter;
  };
}

export interface CreateTaskRequest extends BaseMessage {
  type: 'CREATE_TASK';
  payload: CreateTaskDto;
}

export interface UpdateTaskRequest extends BaseMessage {
  type: 'UPDATE_TASK';
  payload: {
    taskId: string;
    updates: UpdateTaskDto;
  };
}

export interface DeleteTaskRequest extends BaseMessage {
  type: 'DELETE_TASK';
  payload: { taskId: string };
}

export interface UpdateTaskStatusRequest extends BaseMessage {
  type: 'UPDATE_TASK_STATUS';
  payload: {
    taskId: string;
    status: TaskStatus;
  };
}

export interface ReorderTasksRequest extends BaseMessage {
  type: 'REORDER_TASKS';
  payload: {
    taskIds: string[];
    status?: TaskStatus;
  };
}

export interface LoadLabelsRequest extends BaseMessage {
  type: 'LOAD_LABELS';
}

export interface CreateLabelRequest extends BaseMessage {
  type: 'CREATE_LABEL';
  payload: CreateLabelDto;
}

export interface DeleteLabelRequest extends BaseMessage {
  type: 'DELETE_LABEL';
  payload: { labelId: string };
}

export interface CreateDependencyRequest extends BaseMessage {
  type: 'CREATE_DEPENDENCY';
  payload: CreateDependencyDto;
}

export interface DeleteDependencyRequest extends BaseMessage {
  type: 'DELETE_DEPENDENCY';
  payload: { dependencyId: string };
}

export interface ExportDataRequest extends BaseMessage {
  type: 'EXPORT_DATA';
  payload: {
    format: 'json' | 'csv' | 'markdown';
    projectId?: string; // undefined = all data
  };
}

export interface ImportDataRequest extends BaseMessage {
  type: 'IMPORT_DATA';
}

export interface WebviewReadyMessage extends BaseMessage {
  type: 'WEBVIEW_READY';
}

// ============================================
// Helper functions
// ============================================

export function createMessage<T extends BaseMessage>(
  type: T['type'],
  payload?: Omit<T, 'id' | 'timestamp' | 'type'>
): T {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    ...payload,
  } as T;
}
