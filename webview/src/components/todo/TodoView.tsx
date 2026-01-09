import { useState } from 'react';
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
  const { tasks, updateTaskStatus, deleteTask } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Sort by status (todo first, then in_progress, then done), then by sortOrder
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { todo: 0, in_progress: 1, done: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.sortOrder - b.sortOrder;
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleToggle = (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskStatus(task.id, newStatus);
  };

  const handleDelete = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    deleteTask(taskId);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('message.noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b border-border">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-8 p-2"></th>
            <th className="w-8 p-2"></th>
            <th className="p-2 min-w-[200px]">{t('task.title')}</th>
            <th className="p-2 min-w-[150px]">{t('task.description')}</th>
            <th className="p-2 w-24">{t('task.status')}</th>
            <th className="p-2 w-28">{t('task.startDate')}</th>
            <th className="p-2 w-28">{t('task.dueDate')}</th>
            <th className="p-2 w-24">{t('task.assignee')}</th>
            <th className="p-2 w-20">{t('task.progress')}</th>
            <th className="w-16 p-2"></th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const isDone = task.status === 'done';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;

            return (
              <tr
                key={task.id}
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors group',
                  isDone && 'opacity-60'
                )}
              >
                {/* Checkbox */}
                <td className="p-2">
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => handleToggle(task)}
                  />
                </td>

                {/* Status Flag */}
                <td className="p-2">
                  <Flag className={cn('h-4 w-4', STATUS_COLORS[task.status])} />
                </td>

                {/* Title */}
                <td className="p-2">
                  <span className={cn('font-medium', isDone && 'line-through')}>
                    {task.title}
                  </span>
                </td>

                {/* Description */}
                <td className="p-2">
                  <span className="text-muted-foreground truncate block max-w-[200px]">
                    {task.description || '-'}
                  </span>
                </td>

                {/* Status */}
                <td className="p-2">
                  <span className={cn('text-xs', STATUS_COLORS[task.status])}>
                    {task.status === 'todo' && t('status.todo')}
                    {task.status === 'in_progress' && t('status.inProgress')}
                    {task.status === 'done' && t('status.done')}
                  </span>
                </td>

                {/* Start Date */}
                <td className="p-2 text-muted-foreground">
                  {formatDate(task.startDate)}
                </td>

                {/* Due Date */}
                <td className={cn('p-2', isOverdue ? 'text-red-500' : 'text-muted-foreground')}>
                  {formatDate(task.dueDate)}
                </td>

                {/* Assignee */}
                <td className="p-2 text-muted-foreground">
                  {task.assignee || '-'}
                </td>

                {/* Progress */}
                <td className="p-2 text-muted-foreground">
                  {task.progress}%
                </td>

                {/* Actions */}
                <td className="p-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="p-1 rounded hover:bg-muted"
                      title={t('action.edit')}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, task.id)}
                      className="p-1 rounded hover:bg-muted"
                      title={t('action.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
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
