import { useState, useCallback, useRef } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import { Checkbox, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Flag, Trash2, FolderOpen, GripVertical, Check, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/types';
import { STATUS_COLORS } from '@/types';

// Column configuration with resizable widths
interface ColumnConfig {
  id: string;
  minWidth: number;
  defaultWidth: number;
}

// Default column widths
const defaultColumns: ColumnConfig[] = [
  { id: 'title', minWidth: 120, defaultWidth: 200 },
  { id: 'project', minWidth: 80, defaultWidth: 120 },
  { id: 'description', minWidth: 100, defaultWidth: 150 },
  { id: 'status', minWidth: 80, defaultWidth: 100 },
  { id: 'startDate', minWidth: 90, defaultWidth: 110 },
  { id: 'dueDate', minWidth: 90, defaultWidth: 110 },
  { id: 'assignee', minWidth: 80, defaultWidth: 100 },
  { id: 'progress', minWidth: 60, defaultWidth: 80 },
];

// Inline editing state
interface EditingCell {
  taskId: string;
  field: 'title' | 'description' | 'status' | 'startDate' | 'dueDate' | 'assignee' | 'progress';
  value: string;
}

// Row drag state
interface RowDragState {
  taskId: string;
  initialIndex: number;
  currentIndex: number;
}

export function TodoView() {
  const { t, locale } = useI18n();
  const { tasks, updateTaskStatus, updateTaskApi, deleteTask, reorderTasks, showCompletedTasks, currentProjectId, projects } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  // Row drag state
  const [rowDragState, setRowDragState] = useState<RowDragState | null>(null);

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    defaultColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultWidth }), {})
  );

  // Resizing state
  const resizingRef = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);

  // Handle column resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const startWidth = columnWidths[columnId] || defaultColumns.find(c => c.id === columnId)?.defaultWidth || 100;
    resizingRef.current = { columnId, startX: e.clientX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const { columnId: resizingColumnId, startX, startWidth: initialWidth } = resizingRef.current;
      const delta = moveEvent.clientX - startX;
      const minWidth = defaultColumns.find(c => c.id === resizingColumnId)?.minWidth || 60;
      const newWidth = Math.max(minWidth, initialWidth + delta);
      setColumnWidths(prev => ({ ...prev, [resizingColumnId]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Check if we're in All Tasks mode
  const showProjectColumn = currentProjectId === null;

  // Filter and sort tasks
  const filtered = showCompletedTasks ? tasks : tasks.filter(t => t.status !== 'done');
  const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, on_hold: 2, done: 3 };
  const sortedTasks = [...filtered].sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.sortOrder - b.sortOrder;
  });

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  }, []);

  const handleToggle = useCallback((task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskStatus(task.id, newStatus);
  }, [updateTaskStatus]);

  const handleDelete = useCallback((e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    deleteTask(taskId);
  }, [deleteTask]);

  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale);
  }, [locale]);

  // Inline editing handlers
  const startEditing = useCallback((taskId: string, field: EditingCell['field'], currentValue: string) => {
    setEditingCell({ taskId, field, value: currentValue });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const saveEditing = useCallback(() => {
    if (!editingCell) return;

    const { taskId, field, value } = editingCell;
    const updates: Record<string, unknown> = {};

    switch (field) {
      case 'title':
        if (value.trim()) updates.title = value.trim();
        break;
      case 'description':
        updates.description = value.trim() || undefined;
        break;
      case 'status':
        updates.status = value as TaskStatus;
        break;
      case 'startDate':
        updates.startDate = value || undefined;
        break;
      case 'dueDate':
        updates.dueDate = value || undefined;
        break;
      case 'assignee':
        updates.assignee = value.trim() || undefined;
        break;
      case 'progress':
        const progress = Math.min(100, Math.max(0, parseInt(value) || 0));
        updates.progress = progress;
        break;
    }

    if (Object.keys(updates).length > 0) {
      updateTaskApi(taskId, updates);
    }

    setEditingCell(null);
  }, [editingCell, updateTaskApi]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [saveEditing, cancelEditing]);

  // Row drag handlers
  const handleRowDragStart = useCallback((e: React.DragEvent, taskId: string, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setRowDragState({
      taskId,
      initialIndex: index,
      currentIndex: index,
    });
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setRowDragState(prev => prev ? { ...prev, currentIndex: index } : null);
  }, []);

  const handleRowDragEnd = useCallback(() => {
    if (!rowDragState) return;

    const { initialIndex, currentIndex } = rowDragState;
    if (initialIndex !== currentIndex) {
      const reorderedTasks = [...sortedTasks];
      const [movedTask] = reorderedTasks.splice(initialIndex, 1);
      reorderedTasks.splice(currentIndex, 0, movedTask);
      const taskIds = reorderedTasks.map(t => t.id);
      reorderTasks(taskIds);
    }

    setRowDragState(null);
  }, [rowDragState, sortedTasks, reorderTasks]);

  if (sortedTasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-base">{t('message.noTasks')}</p>
      </div>
    );
  }

  // Resizable column header component with border
  const ResizableHeader = ({ columnId, children }: { columnId: string; children: React.ReactNode }) => (
    <th
      className="p-3 relative select-none border-r border-border"
      style={{ width: columnWidths[columnId], minWidth: defaultColumns.find(c => c.id === columnId)?.minWidth }}
    >
      {children}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-col-resize hover:bg-primary/50 active:bg-primary z-10"
        onMouseDown={(e) => handleResizeStart(e, columnId)}
      />
    </th>
  );

  // Editable cell component
  const EditableCell = ({
    taskId,
    field,
    value,
    displayValue,
    className,
    style,
    type = 'text',
  }: {
    taskId: string;
    field: EditingCell['field'];
    value: string;
    displayValue?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    type?: 'text' | 'date' | 'number';
  }) => {
    const isEditing = editingCell?.taskId === taskId && editingCell?.field === field;

    if (isEditing) {
      return (
        <td className={cn('p-1', className)} style={style}>
          <div className="flex items-center gap-1">
            <Input
              type={type}
              value={editingCell.value}
              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
              onKeyDown={handleKeyDown}
              onBlur={saveEditing}
              autoFocus
              className="h-7 text-sm"
            />
            <button
              onClick={saveEditing}
              className="p-1 rounded hover:bg-muted shrink-0"
              title={t('action.save')}
            >
              <Check className="h-3 w-3 text-green-500" />
            </button>
            <button
              onClick={cancelEditing}
              className="p-1 rounded hover:bg-muted shrink-0"
              title={t('action.cancel')}
            >
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
        </td>
      );
    }

    return (
      <td
        className={cn('p-3 truncate cursor-pointer hover:bg-muted/30', className)}
        style={style}
        onClick={() => startEditing(taskId, field, value)}
        title={t('action.edit')}
      >
        {displayValue ?? (value || '-')}
      </td>
    );
  };

  // Status select cell
  const StatusCell = ({ task, style }: { task: Task; style?: React.CSSProperties }) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'status';

    if (isEditing) {
      return (
        <td className="p-1" style={style}>
          <Select
            value={editingCell.value}
            onValueChange={(value) => {
              updateTaskApi(task.id, { status: value as TaskStatus });
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-7 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">{t('status.todo')}</SelectItem>
              <SelectItem value="in_progress">{t('status.inProgress')}</SelectItem>
              <SelectItem value="on_hold">{t('status.onHold')}</SelectItem>
              <SelectItem value="done">{t('status.done')}</SelectItem>
            </SelectContent>
          </Select>
        </td>
      );
    }

    return (
      <td
        className="p-3 truncate cursor-pointer hover:bg-muted/30"
        style={style}
        onClick={() => startEditing(task.id, 'status', task.status)}
        title={t('action.edit')}
      >
        <span className={cn('text-sm', STATUS_COLORS[task.status])}>
          {task.status === 'todo' && t('status.todo')}
          {task.status === 'in_progress' && t('status.inProgress')}
          {task.status === 'on_hold' && t('status.onHold')}
          {task.status === 'done' && t('status.done')}
        </span>
      </td>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-base table-fixed border-collapse">
        <thead className="sticky top-0 bg-background border-b border-border z-10">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="w-8 p-3"></th>
            <th className="w-10 p-3"></th>
            <th className="w-10 p-3"></th>
            <ResizableHeader columnId="title">{t('task.title')}</ResizableHeader>
            {showProjectColumn && (
              <ResizableHeader columnId="project">{t('task.project')}</ResizableHeader>
            )}
            <ResizableHeader columnId="description">{t('task.description')}</ResizableHeader>
            <ResizableHeader columnId="status">{t('task.status')}</ResizableHeader>
            <ResizableHeader columnId="startDate">{t('task.startDate')}</ResizableHeader>
            <ResizableHeader columnId="dueDate">{t('task.dueDate')}</ResizableHeader>
            <ResizableHeader columnId="assignee">{t('task.assignee')}</ResizableHeader>
            <ResizableHeader columnId="progress">{t('task.progress')}</ResizableHeader>
            <th className="w-12 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task, index) => {
            const isDone = task.status === 'done';
            // Calculate due date status
            let dueDateStatus: 'normal' | 'warning' | 'overdue' = 'normal';
            if (task.dueDate && !isDone) {
              const dueDate = new Date(task.dueDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              dueDate.setHours(0, 0, 0, 0);
              const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                dueDateStatus = 'overdue';
              } else if (diffDays === 0) {
                dueDateStatus = 'warning';
              }
            }

            // Get project info for this task
            const projectInfo = showProjectColumn && task.projectId
              ? projects.find(p => p.id === task.projectId)
              : null;

            const isRowDragging = rowDragState?.taskId === task.id;
            const isDropTarget = rowDragState && rowDragState.currentIndex === index && rowDragState.taskId !== task.id;

            return (
              <tr
                key={task.id}
                draggable
                onDragStart={(e) => handleRowDragStart(e, task.id, index)}
                onDragOver={(e) => handleRowDragOver(e, index)}
                onDragEnd={handleRowDragEnd}
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors group',
                  isDone && 'opacity-60',
                  isRowDragging && 'opacity-50 bg-muted/50',
                  isDropTarget && 'border-t-2 border-t-primary'
                )}
              >
                {/* Drag handle */}
                <td className="p-2">
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                </td>

                {/* Checkbox */}
                <td className="p-3">
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => handleToggle(task)}
                    className="h-5 w-5"
                  />
                </td>

                {/* Status Flag */}
                <td className="p-3">
                  <Flag className={cn('h-5 w-5', STATUS_COLORS[task.status])} />
                </td>

                {/* Title */}
                <EditableCell
                  taskId={task.id}
                  field="title"
                  value={task.title}
                  displayValue={
                    <span className={cn('font-medium', isDone && 'line-through')}>
                      {task.title}
                    </span>
                  }
                  style={{ width: columnWidths.title }}
                />

                {/* Project (only in All Tasks mode) */}
                {showProjectColumn && (
                  <td className="p-3 truncate" style={{ width: columnWidths.project }}>
                    {projectInfo ? (
                      <div className="flex items-center gap-1 text-xs">
                        <FolderOpen className="h-3 w-3 shrink-0" style={{ color: projectInfo.color }} />
                        <span
                          className="px-1.5 py-0.5 rounded truncate"
                          style={{ backgroundColor: projectInfo.color + '20', color: projectInfo.color }}
                        >
                          {projectInfo.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                )}

                {/* Description */}
                <EditableCell
                  taskId={task.id}
                  field="description"
                  value={task.description || ''}
                  displayValue={
                    <span className="text-muted-foreground truncate block">
                      {task.description || '-'}
                    </span>
                  }
                  style={{ width: columnWidths.description }}
                />

                {/* Status */}
                <StatusCell task={task} style={{ width: columnWidths.status }} />

                {/* Start Date */}
                <EditableCell
                  taskId={task.id}
                  field="startDate"
                  value={task.startDate || ''}
                  displayValue={formatDate(task.startDate)}
                  className="text-muted-foreground"
                  style={{ width: columnWidths.startDate }}
                  type="date"
                />

                {/* Due Date */}
                <EditableCell
                  taskId={task.id}
                  field="dueDate"
                  value={task.dueDate || ''}
                  displayValue={formatDate(task.dueDate)}
                  className={cn(
                    dueDateStatus === 'overdue' && 'text-red-500',
                    dueDateStatus === 'warning' && 'text-yellow-500',
                    dueDateStatus === 'normal' && 'text-muted-foreground'
                  )}
                  style={{ width: columnWidths.dueDate }}
                  type="date"
                />

                {/* Assignee */}
                <EditableCell
                  taskId={task.id}
                  field="assignee"
                  value={task.assignee || ''}
                  displayValue={task.assignee || '-'}
                  className="text-muted-foreground"
                  style={{ width: columnWidths.assignee }}
                />

                {/* Progress */}
                <EditableCell
                  taskId={task.id}
                  field="progress"
                  value={String(task.progress)}
                  displayValue={`${task.progress}%`}
                  className="text-muted-foreground"
                  style={{ width: columnWidths.progress }}
                  type="number"
                />

                {/* Actions */}
                <td className="p-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="p-1.5 rounded hover:bg-muted"
                      title={t('action.edit')}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, task.id)}
                      className="p-1.5 rounded hover:bg-muted"
                      title={t('action.delete')}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <TaskFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
