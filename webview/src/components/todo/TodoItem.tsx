import { memo, useCallback, useMemo } from 'react';
import type { Task } from '@/types';
import { Checkbox, Badge, Progress } from '@/components/ui';
import { useTaskStore } from '@/stores/taskStore';
import { Calendar, User, Flag, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS } from '@/types';

interface TodoItemProps {
  task: Task;
  onEdit: () => void;
}

export const TodoItem = memo(function TodoItem({ task, onEdit }: TodoItemProps) {
  const { updateTaskStatus, deleteTask } = useTaskStore();

  const isOverdue = useMemo(() =>
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done',
    [task.dueDate, task.status]
  );
  const isDone = task.status === 'done';

  const handleToggle = useCallback(() => {
    const newStatus = isDone ? 'todo' : 'done';
    updateTaskStatus(task.id, newStatus);
  }, [isDone, task.id, updateTaskStatus]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  }, [task.id, deleteTask]);

  return (
    <div
      className={cn(
        'group flex items-start gap-2 rounded-md border border-transparent p-2 hover:border-border hover:bg-muted/50 transition-colors',
        isDone && 'opacity-60'
      )}
    >
      <Checkbox checked={isDone} onCheckedChange={handleToggle} className="mt-0.5" />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={cn('text-sm font-medium truncate', isDone && 'line-through')}
          >
            {task.title}
          </span>
          <Flag className={cn('h-3 w-3 shrink-0', PRIORITY_COLORS[task.priority])} />
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="text-[10px] px-1 py-0"
                  style={{ borderColor: label.color, color: label.color }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Meta */}
          {task.dueDate && (
            <div
              className={cn(
                'flex items-center gap-0.5 text-[10px] text-muted-foreground',
                isOverdue && 'text-red-500'
              )}
            >
              <Calendar className="h-2.5 w-2.5" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}

          {task.assignee && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              <span>{task.assignee}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {task.progress > 0 && task.progress < 100 && (
          <div className="flex items-center gap-2">
            <Progress value={task.progress} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-muted"
          title="Edit"
        >
          <Edit2 className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-muted"
          title="Delete"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
        </button>
      </div>
    </div>
  );
});
