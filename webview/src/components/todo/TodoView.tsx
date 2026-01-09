import { useState, useMemo, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import { Checkbox } from '@/components/ui';
import { Flag, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import { STATUS_COLORS } from '@/types';

export function TodoView() {
  const { t, locale } = useI18n();
  const { tasks, updateTaskStatus, deleteTask, showCompletedTasks } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Filter and sort tasks - memoized
  const sortedTasks = useMemo(() => {
    const filtered = showCompletedTasks ? tasks : tasks.filter(t => t.status !== 'done');
    const statusOrder = { todo: 0, in_progress: 1, on_hold: 2, done: 3 };
    return [...filtered].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.sortOrder - b.sortOrder;
    });
  }, [tasks, showCompletedTasks]);

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

  if (sortedTasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-base">{t('message.noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-base">
        <thead className="sticky top-0 bg-background border-b border-border">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="w-10 p-3"></th>
            <th className="w-10 p-3"></th>
            <th className="p-3 min-w-[200px]">{t('task.title')}</th>
            <th className="p-3 min-w-[150px]">{t('task.description')}</th>
            <th className="p-3 w-28">{t('task.status')}</th>
            <th className="p-3 w-32">{t('task.startDate')}</th>
            <th className="p-3 w-32">{t('task.dueDate')}</th>
            <th className="p-3 w-28">{t('task.assignee')}</th>
            <th className="p-3 w-24">{t('task.progress')}</th>
            <th className="w-20 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
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
                dueDateStatus = 'overdue'; // Past due - red
              } else if (diffDays === 0) {
                dueDateStatus = 'warning'; // Due today - yellow
              }
            }

            return (
              <tr
                key={task.id}
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors group',
                  isDone && 'opacity-60'
                )}
              >
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
                <td className="p-3">
                  <span className={cn('font-medium', isDone && 'line-through')}>
                    {task.title}
                  </span>
                </td>

                {/* Description */}
                <td className="p-3">
                  <span className="text-muted-foreground truncate block max-w-[200px]">
                    {task.description || '-'}
                  </span>
                </td>

                {/* Status */}
                <td className="p-3">
                  <span className={cn('text-sm', STATUS_COLORS[task.status])}>
                    {task.status === 'todo' && t('status.todo')}
                    {task.status === 'in_progress' && t('status.inProgress')}
                    {task.status === 'on_hold' && t('status.onHold')}
                    {task.status === 'done' && t('status.done')}
                  </span>
                </td>

                {/* Start Date */}
                <td className="p-3 text-muted-foreground">
                  {formatDate(task.startDate)}
                </td>

                {/* Due Date */}
                <td className={cn(
                  'p-3',
                  dueDateStatus === 'overdue' && 'text-red-500',
                  dueDateStatus === 'warning' && 'text-yellow-500',
                  dueDateStatus === 'normal' && 'text-muted-foreground'
                )}>
                  {formatDate(task.dueDate)}
                </td>

                {/* Assignee */}
                <td className="p-3 text-muted-foreground">
                  {task.assignee || '-'}
                </td>

                {/* Progress */}
                <td className="p-3 text-muted-foreground">
                  {task.progress}%
                </td>

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
