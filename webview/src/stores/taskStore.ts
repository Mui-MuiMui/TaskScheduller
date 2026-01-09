import { create } from 'zustand';
import type {
  Task,
  Label,
  Dependency,
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

  // UI State
  currentView: ViewType;
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;
  currentProjectId: string | null;
  showCompletedTasks: boolean;

  // Config
  locale: string;
  theme: 'light' | 'dark' | 'high-contrast';

  // Actions - Data
  setTasks: (tasks: Task[]) => void;
  setLabels: (labels: Label[]) => void;
  setDependencies: (dependencies: Dependency[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: string) => void;

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
  createTask: (dto: CreateTaskDto) => void;
  updateTaskApi: (taskId: string, updates: UpdateTaskDto) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (taskIds: string[], status?: TaskStatus) => void;
  createLabel: (name: string, color: string) => void;
  deleteLabel: (labelId: string) => void;
  createDependency: (predecessorId: string, successorId: string) => void;
  deleteDependency: (dependencyId: string) => void;

  // Selectors
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTaskById: (id: string) => Task | undefined;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  labels: [],
  dependencies: [],
  currentView: 'kanban',
  selectedTaskId: null,
  isLoading: true,
  error: null,
  currentProjectId: null,
  showCompletedTasks: true,
  locale: 'en',
  theme: 'dark',

  // Data setters
  setTasks: (tasks) => set({ tasks }),
  setLabels: (labels) => set({ labels }),
  setDependencies: (dependencies) => set({ dependencies }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  updateTask: (task) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
  })),

  removeTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== taskId),
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

  createTask: (dto) => {
    postMessage({ type: 'CREATE_TASK', payload: dto });
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
    const { setTasks, setLabels, setDependencies, addTask, updateTask, removeTask, setLoading, setError, setConfig } = useTaskStore.getState();

    switch (message.type) {
      case 'TASKS_LOADED':
        const tasksPayload = message as { payload: { tasks: Task[]; labels: Label[]; dependencies: Dependency[] } };
        setTasks(tasksPayload.payload.tasks);
        setLabels(tasksPayload.payload.labels);
        setDependencies(tasksPayload.payload.dependencies);
        setLoading(false);
        break;

      case 'TASK_CREATED':
        const createdPayload = message as { payload: { task: Task } };
        addTask(createdPayload.payload.task);
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

      case 'CONFIG_CHANGED':
        const configPayload = message as { payload: { locale: string; theme: 'light' | 'dark' | 'high-contrast' } };
        setConfig(configPayload.payload);
        break;

      case 'ERROR':
        const errorPayload = message as { payload: { message: string } };
        setError(errorPayload.payload.message);
        setLoading(false);
        break;

      case 'COMMAND':
        const commandPayload = message as { command: string; payload?: { view?: ViewType; projectId?: string } };
        if (commandPayload.command === 'SWITCH_VIEW' && commandPayload.payload?.view) {
          useTaskStore.setState({ currentView: commandPayload.payload.view });
        } else if (commandPayload.command === 'CREATE_TASK_DIALOG') {
          // This will be handled by UI component
          window.dispatchEvent(new CustomEvent('openCreateTaskDialog'));
        } else if (commandPayload.command === 'SET_PROJECT' && commandPayload.payload?.projectId) {
          useTaskStore.setState({ currentProjectId: commandPayload.payload.projectId });
          // Reload tasks for new project
          useTaskStore.getState().loadTasks();
        }
        break;
    }
  });
}
