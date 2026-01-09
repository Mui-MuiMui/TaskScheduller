import { memo, useMemo } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, Badge, Progress } from '@/components/ui';
import { Calendar, User, Clock, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

export const TaskCard = memo(function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  // Calculate due date status - memoized to avoid recalculation
  const dueDateStatus = useMemo(() => {
    if (!task.dueDate || task.status === 'done') return 'normal' as const;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue' as const;
    if (diffDays === 0) return 'warning' as const;
    return 'normal' as const;
  }, [task.dueDate, task.status]);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isDragging && 'opacity-50 rotate-2 scale-105',
        dueDateStatus === 'overdue' && 'border-red-500/50',
        dueDateStatus === 'warning' && 'border-yellow-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title and Status */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-base font-medium leading-tight">{task.title}</span>
          <Flag className={cn('h-4 w-4 shrink-0', STATUS_COLORS[task.status])} />
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="text-xs px-1.5 py-0.5"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {task.dueDate && (
            <div className={cn(
              'flex items-center gap-1',
              dueDateStatus === 'overdue' && 'text-red-500',
              dueDateStatus === 'warning' && 'text-yellow-500'
            )}>
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {task.progress > 0 && (
          <div className="space-y-1">
            <Progress value={task.progress} className="h-1.5" />
            <div className="text-xs text-muted-foreground text-right">{task.progress}%</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
