import type { DraggableProvided } from '@hello-pangea/dnd';
import type { Task } from '@/types';
import { TaskCard } from '@/components/common/TaskCard';

interface KanbanCardProps {
  task: Task;
  provided: DraggableProvided;
  isDragging: boolean;
  onClick: () => void;
}

export function KanbanCard({ task, provided, isDragging, onClick }: KanbanCardProps) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}
