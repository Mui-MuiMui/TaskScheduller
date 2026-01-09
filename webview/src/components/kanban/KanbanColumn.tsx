import type { DroppableProvided } from '@hello-pangea/dnd';
import { Draggable } from '@hello-pangea/dnd';
import type { Task, TaskStatus } from '@/types';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  provided: DroppableProvided;
  isDraggingOver: boolean;
  onEditTask: (task: Task) => void;
}

export function KanbanColumn({
  status,
  label,
  tasks,
  provided,
  isDraggingOver,
  onEditTask,
}: KanbanColumnProps) {
  const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    done: 'bg-green-500',
  };

  return (
    <div className="flex-1 min-w-[240px] max-w-[350px] flex flex-col bg-muted/30 rounded-md">
      {/* Column Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className={cn('w-3 h-3 rounded-full', statusColors[status])} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{tasks.length}</span>
      </div>

      {/* Column Content */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]',
          isDraggingOver && 'bg-accent/20'
        )}
      >
        {tasks.map((task, index) => (
          <Draggable key={task.id} draggableId={task.id} index={index}>
            {(provided, snapshot) => (
              <KanbanCard
                task={task}
                provided={provided}
                isDragging={snapshot.isDragging}
                onClick={() => onEditTask(task)}
              />
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    </div>
  );
}
