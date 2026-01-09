import { useState } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useTaskStore } from '@/stores/taskStore';
import { KanbanColumn } from './KanbanColumn';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import type { Task, TaskStatus } from '@/types';
import { KANBAN_COLUMNS } from '@/types';

export function KanbanView() {
  const { tasks, reorderTasks, updateTaskStatus } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    // Get tasks for the destination column
    const destTasks = tasks
      .filter((t) => t.status === destStatus)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // If moving to different column, update status
    if (sourceStatus !== destStatus) {
      updateTaskStatus(draggableId, destStatus);
    }

    // Reorder within destination
    const taskIds = destTasks.map((t) => t.id);

    // Remove if coming from same column
    if (sourceStatus === destStatus) {
      taskIds.splice(source.index, 1);
    }

    // Insert at new position
    taskIds.splice(destination.index, 0, draggableId);

    reorderTasks(taskIds, destStatus);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-2 h-full min-h-0">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = tasks
              .filter((t) => t.status === column.status)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <Droppable key={column.status} droppableId={column.status}>
                {(provided, snapshot) => (
                  <KanbanColumn
                    status={column.status}
                    label={column.label}
                    tasks={columnTasks}
                    provided={provided}
                    isDraggingOver={snapshot.isDraggingOver}
                    onEditTask={handleEditTask}
                  />
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <TaskFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
      />
    </>
  );
}
