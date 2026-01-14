import { create } from 'zustand';
import type {
  Task,
  Label,
  Dependency,
  Project,
  KanbanColumn,
  ViewType,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
} from '@/types';
import { postMessage, onMessage } from '@/api/vscode';

interface TaskState {
  // Data
  tasks: Task[];
  labels: Label[];
  dependencies: Dependency[];
  projects: Project[];
  kanbanColumns: KanbanColumn[];

  // UI State
  currentView: ViewType;
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;
  currentProjectId: string | null;
  showCompletedTasks: boolean;

  // Pending duplicate insert info (for Ctrl+drag duplicate)
  pendingDuplicateInsert: { insertAfterTaskId: string } | null;

  // Config
  locale: string;
  theme: 'light' | 'dark' | 'high-contrast';

  // Actions - Data
  setTasks: (tasks: Task[]) => void;
  setLabels: (labels: Label[]) => void;
  setDependencies: (dependencies: Dependency[]) => void;
  setProjects: (projects: Project[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: string) => void;

  // Actions - Kanban Columns
  setKanbanColumns: (columns: KanbanColumn[]) => void;
  addKanbanColumn: (column: KanbanColumn) => void;
  updateKanbanColumnInStore: (column: KanbanColumn) => void;
  removeKanbanColumn: (columnId: string) => void;

  // Actions - UI
  setCurrentView: (view: ViewType) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConfig: (config: { locale: string; theme: 'light' | 'dark' | 'high-contrast' }) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  setShowCompletedTasks: (show: boolean) => void;

  // Actions - API calls (send to extension)
  loadTasks: () => void;
  createTask: (dto: CreateTaskDto, predecessorIds?: string[], insertAfterTaskId?: string) => void;
  updateTaskApi: (taskId: string, updates: UpdateTaskDto) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (taskIds: string[], status?: TaskStatus) => void;
  createLabel: (name: string, color: string) => void;
  deleteLabel: (labelId: string) => void;
  createDependency: (predecessorId: string, successorId: string) => void;
  deleteDependency: (dependencyId: string) => void;
  exportData: (format: 'json' | 'csv') => void;
  importData: () => void;

  // Actions - Kanban Column API calls
  loadKanbanColumns: () => void;
  createKanbanColumn: (name: string, color: string, projectId?: string | null) => void;
  updateKanbanColumn: (columnId: string, updates: { name?: string; color?: string }) => void;
  deleteKanbanColumn: (columnId: string, targetColumnId?: string) => void;
  reorderKanbanColumns: (columnIds: string[]) => void;

  // Selectors
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTaskById: (id: string) => Task | undefined;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  labels: [],
  dependencies: [],
  projects: [],
  kanbanColumns: [],
  currentView: 'kanban',
  selectedTaskId: null,
  isLoading: true,
  error: null,
  currentProjectId: null,
  showCompletedTasks: true,
  pendingDuplicateInsert: null,
  locale: 'en',
  theme: 'dark',

  // Data setters
  setTasks: (tasks) => set({ tasks }),
  setLabels: (labels) => set({ labels }),
  setDependencies: (dependencies) => set({ dependencies }),
  setProjects: (projects) => set({ projects }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  updateTask: (task) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
  })),

  removeTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== taskId),
  })),

  // Kanban Column setters
  setKanbanColumns: (columns) => set({ kanbanColumns: columns }),

  addKanbanColumn: (column) => set((state) => {
    // Only add column if it's global or belongs to current project
    const currentProjectId = state.currentProjectId;
    const shouldAdd = column.projectId === null || column.projectId === currentProjectId;
    if (!shouldAdd) {
      return state;
    }
    return {
      kanbanColumns: [...state.kanbanColumns, column].sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }),

  updateKanbanColumnInStore: (column) => set((state) => ({
    kanbanColumns: state.kanbanColumns
      .map((c) => (c.id === column.id ? column : c))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  })),

  removeKanbanColumn: (columnId) => set((state) => ({
    kanbanColumns: state.kanbanColumns.filter((c) => c.id !== columnId),
  })),

  // UI setters
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setConfig: (config) => set({ locale: config.locale, theme: config.theme }),
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),
  setShowCompletedTasks: (show) => set({ showCompletedTasks: show }),

  // API calls
  loadTasks: () => {
    set({ isLoading: true });
    const projectId = get().currentProjectId;
    postMessage({ type: 'LOAD_TASKS', payload: { filter: projectId ? { projectId } : undefined } });
  },

  createTask: (dto, predecessorIds, insertAfterTaskId) => {
    if (insertAfterTaskId) {
      set({ pendingDuplicateInsert: { insertAfterTaskId } });
    }
    postMessage({ type: 'CREATE_TASK', payload: { ...dto, predecessorIds } });
  },

  updateTaskApi: (taskId, updates) => {
    postMessage({ type: 'UPDATE_TASK', payload: { taskId, updates } });
  },

  updateTaskStatus: (taskId, status) => {
    postMessage({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status } });
  },

  deleteTask: (taskId) => {
    postMessage({ type: 'DELETE_TASK', payload: { taskId } });
  },

  reorderTasks: (taskIds, status) => {
    postMessage({ type: 'REORDER_TASKS', payload: { taskIds, status } });
  },

  createLabel: (name, color) => {
    postMessage({ type: 'CREATE_LABEL', payload: { name, color } });
  },

  deleteLabel: (labelId) => {
    postMessage({ type: 'DELETE_LABEL', payload: { labelId } });
  },

  createDependency: (predecessorId, successorId) => {
    postMessage({
      type: 'CREATE_DEPENDENCY',
      payload: { predecessorId, successorId, dependencyType: 'finish_to_start' },
    });
  },

  deleteDependency: (dependencyId) => {
    postMessage({ type: 'DELETE_DEPENDENCY', payload: { dependencyId } });
  },

  exportData: (format) => {
    postMessage({ type: 'EXPORT_DATA', payload: { format } });
  },

  importData: () => {
    postMessage({ type: 'IMPORT_DATA' });
  },

  // Kanban Column API calls
  loadKanbanColumns: () => {
    postMessage({ type: 'LOAD_KANBAN_COLUMNS' });
  },

  createKanbanColumn: (name, color, projectId) => {
    postMessage({ type: 'CREATE_KANBAN_COLUMN', payload: { name, color, projectId } });
  },

  updateKanbanColumn: (columnId, updates) => {
    postMessage({ type: 'UPDATE_KANBAN_COLUMN', payload: { columnId, updates } });
  },

  deleteKanbanColumn: (columnId, targetColumnId) => {
    postMessage({ type: 'DELETE_KANBAN_COLUMN', payload: { columnId, targetColumnId } });
  },

  reorderKanbanColumns: (columnIds) => {
    const projectId = get().currentProjectId;
    postMessage({ type: 'REORDER_KANBAN_COLUMNS', payload: { columnIds, projectId } });
  },

  // Selectors
  getTasksByStatus: (status) => {
    return get().tasks.filter((t) => t.status === status).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getTaskById: (id) => {
    return get().tasks.find((t) => t.id === id);
  },
}));

// Message handler - call this once on app init
export function initializeMessageHandler() {
  // Send ready message
  postMessage({ type: 'WEBVIEW_READY' });

  // Listen for messages from extension
  return onMessage((message) => {
    const {
      setTasks,
      setLabels,
      setDependencies,
      setProjects,
      addTask,
      updateTask,
      removeTask,
      setLoading,
      setError,
      setConfig,
      setKanbanColumns,
      addKanbanColumn,
      updateKanbanColumnInStore,
      removeKanbanColumn,
    } = useTaskStore.getState();

    switch (message.type) {
      case 'TASKS_LOADED':
        const tasksPayload = message as { payload: { tasks: Task[]; labels: Label[]; dependencies: Dependency[]; projects: Project[] } };
        setTasks(tasksPayload.payload.tasks);
        setLabels(tasksPayload.payload.labels);
        setDependencies(tasksPayload.payload.dependencies);
        setProjects(tasksPayload.payload.projects);
        setLoading(false);
        break;

      case 'TASK_CREATED':
        const createdPayload = message as { payload: { task: Task } };
        addTask(createdPayload.payload.task);

        // Handle pending duplicate insert (Ctrl+drag duplicate)
        const pendingInsert = useTaskStore.getState().pendingDuplicateInsert;
        if (pendingInsert) {
          const currentTasks = useTaskStore.getState().tasks;
          const allTasksSorted = [...currentTasks].sort((a, b) => a.sortOrder - b.sortOrder);
          const allTaskIds = allTasksSorted.map(t => t.id);

          // Find insert position
          const insertAfterIndex = allTaskIds.indexOf(pendingInsert.insertAfterTaskId);
          const newTaskId = createdPayload.payload.task.id;

          // Remove new task from its current position (at the end)
          const currentIndex = allTaskIds.indexOf(newTaskId);
          if (currentIndex !== -1) {
            allTaskIds.splice(currentIndex, 1);
          }

          // Insert after the target task
          if (insertAfterIndex !== -1) {
            allTaskIds.splice(insertAfterIndex + 1, 0, newTaskId);
          } else {
            allTaskIds.push(newTaskId);
          }

          // Reorder tasks
          postMessage({ type: 'REORDER_TASKS', payload: { taskIds: allTaskIds } });

          // Clear pending state
          useTaskStore.setState({ pendingDuplicateInsert: null });
        }
        break;

      case 'TASK_UPDATED':
        const updatedPayload = message as { payload: { task: Task } };
        updateTask(updatedPayload.payload.task);
        break;

      case 'TASK_DELETED':
        const deletedPayload = message as { payload: { taskId: string } };
        removeTask(deletedPayload.payload.taskId);
        break;

      case 'LABEL_CREATED':
        const labelPayload = message as { payload: { label: Label } };
        useTaskStore.setState((state) => ({
          labels: [...state.labels, labelPayload.payload.label],
        }));
        break;

      case 'DEPENDENCY_CREATED':
        const depCreatedPayload = message as { payload: { dependency: Dependency } };
        useTaskStore.setState((state) => ({
          dependencies: [...state.dependencies, depCreatedPayload.payload.dependency],
        }));
        break;

      case 'DEPENDENCY_DELETED':
        const depDeletedPayload = message as { payload: { dependencyId: string } };
        useTaskStore.setState((state) => ({
          dependencies: state.dependencies.filter((d) => d.id !== depDeletedPayload.payload.dependencyId),
        }));
        break;

      case 'CONFIG_CHANGED':
        const configPayload = message as { payload: { locale: string; theme: 'light' | 'dark' | 'high-contrast'; defaultView: ViewType } };
        setConfig(configPayload.payload);
        // 初回読み込み時（isLoadingがtrue）のみdefaultViewを適用
        if (useTaskStore.getState().isLoading && configPayload.payload.defaultView) {
          useTaskStore.setState({ currentView: configPayload.payload.defaultView });
        }
        break;

      case 'ERROR':
        const errorPayload = message as { payload: { message: string } };
        setError(errorPayload.payload.message);
        setLoading(false);
        break;

      case 'COMMAND':
        const commandPayload = message as { command: string; payload?: { view?: ViewType; projectId?: string | null } };
        if (commandPayload.command === 'SWITCH_VIEW' && commandPayload.payload?.view) {
          useTaskStore.setState({ currentView: commandPayload.payload.view });
        } else if (commandPayload.command === 'CREATE_TASK_DIALOG') {
          // This will be handled by UI component
          window.dispatchEvent(new CustomEvent('openCreateTaskDialog'));
        } else if (commandPayload.command === 'SET_PROJECT') {
          // projectId can be null to show all tasks (cross-project view)
          const newProjectId = commandPayload.payload?.projectId || null;
          useTaskStore.setState({ currentProjectId: newProjectId });
          // Tasks will be reloaded by extension
        }
        break;

      case 'KANBAN_COLUMNS_LOADED':
        const columnsPayload = message as { payload: { columns: KanbanColumn[] } };
        setKanbanColumns(columnsPayload.payload.columns);
        break;

      case 'KANBAN_COLUMN_CREATED':
        const createdColumnPayload = message as { payload: { column: KanbanColumn } };
        addKanbanColumn(createdColumnPayload.payload.column);
        break;

      case 'KANBAN_COLUMN_UPDATED':
        const updatedColumnPayload = message as { payload: { column: KanbanColumn } };
        updateKanbanColumnInStore(updatedColumnPayload.payload.column);
        break;

      case 'KANBAN_COLUMN_DELETED':
        const deletedColumnPayload = message as { payload: { columnId: string } };
        removeKanbanColumn(deletedColumnPayload.payload.columnId);
        break;

      case 'KANBAN_COLUMNS_REORDERED':
        const reorderedPayload = message as { payload: { columns: KanbanColumn[] } };
        setKanbanColumns(reorderedPayload.payload.columns);
        break;
    }
  });
}
