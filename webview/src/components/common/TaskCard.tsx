import type { Task } from '@/types';
import { Card, CardContent, Badge, Progress } from '@/components/ui';
import { Calendar, User, Clock, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isDragging && 'opacity-50 rotate-2 scale-105',
        isOverdue && 'border-red-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-2 space-y-2">
        {/* Title and Priority */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-tight">{task.title}</span>
          <Flag className={cn('h-3 w-3 shrink-0', PRIORITY_COLORS[task.priority])} />
        </div>

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

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {task.dueDate && (
            <div className={cn('flex items-center gap-0.5', isOverdue && 'text-red-500')}>
              <Calendar className="h-2.5 w-2.5" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center gap-0.5">
              <User className="h-2.5 w-2.5" />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.estimatedHours && (
            <div className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {task.progress > 0 && (
          <div className="space-y-1">
            <Progress value={task.progress} className="h-1" />
            <div className="text-[10px] text-muted-foreground text-right">{task.progress}%</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
