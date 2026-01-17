import { memo, useCallback, useMemo } from 'react';
import type { Task } from '@/types';
import { Checkbox, Badge, Progress, Button } from '@/components/ui';
import { useTaskStore } from '@/stores/taskStore';
import { Calendar, User, Flag, Trash2, Edit2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS } from '@/types';

interface TodoItemProps {
  task: Task;
  onEdit: () => void;
}

export const TodoItem = memo(function TodoItem({ task, onEdit }: TodoItemProps) {
  const { updateTaskStatus, deleteTask, currentProjectId, projects } = useTaskStore();

  // Get project info for this task (only shown in All Tasks mode)
  const projectInfo = useMemo(() => {
    if (currentProjectId !== null || !task.projectId) return null;
    return projects.find(p => p.id === task.projectId);
  }, [currentProjectId, task.projectId, projects]);

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
          {/* Project indicator (only in All Tasks mode) */}
          {projectInfo && (
            <div className="flex items-center gap-0.5 text-[10px]">
              <FolderOpen className="h-2.5 w-2.5" />
              <span
                className="px-1 py-0 rounded"
                style={{ backgroundColor: projectInfo.color + '20', color: projectInfo.color }}
              >
                {projectInfo.name}
              </span>
            </div>
          )}

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
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          title="Edit"
          className="h-6 w-6"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          title="Delete"
          className="h-6 w-6 hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});
