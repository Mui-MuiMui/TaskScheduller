import { memo } from 'react';
import type { DroppableProvided, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, Settings } from 'lucide-react';
import type { Task, KanbanColumn as KanbanColumnType } from '@/types';
import { getHexColor } from '@/types';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  provided: DroppableProvided;
  isDraggingOver: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
  onEditTask: (task: Task) => void;
  onEditColumn: (column: KanbanColumnType) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  column,
  tasks,
  provided,
  isDraggingOver,
  dragHandleProps,
  isDragging,
  onEditTask,
  onEditColumn,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        'h-full min-w-[240px] max-w-[350px] flex flex-col bg-muted/30 rounded-md',
        isDragging && 'opacity-50'
      )}
    >
      {/* Column Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 p-3 border-b border-border bg-muted rounded-t-md">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getHexColor(column.color) }} />
        <span className="text-sm font-semibold flex-1">{column.name}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onEditColumn(column)}
        >
          <Settings className="w-3 h-3" />
        </Button>
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
            {(dragProvided, snapshot) => (
              <KanbanCard
                task={task}
                provided={dragProvided}
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
});
