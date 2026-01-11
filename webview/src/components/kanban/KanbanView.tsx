import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { KanbanColumn } from './KanbanColumn';
import { ColumnFormDialog } from './ColumnFormDialog';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import { Button } from '@/components/ui/button';
import type { Task, KanbanColumn as KanbanColumnType, TaskStatus } from '@/types';

export function KanbanView() {
  const { t } = useI18n();
  const {
    tasks,
    kanbanColumns,
    reorderTasks,
    updateTaskStatus,
    showCompletedTasks,
    reorderKanbanColumns,
  } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnType | undefined>(undefined);

  // Filter tasks based on showCompletedTasks
  const filteredTasks = showCompletedTasks
    ? tasks
    : tasks.filter((t) => t.status !== 'done');

  // Filter columns based on showCompletedTasks
  const visibleColumns = showCompletedTasks
    ? kanbanColumns
    : kanbanColumns.filter((col) => col.id !== 'done');

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    // Dropped outside
    if (!destination) return;

    // Column drag
    if (type === 'COLUMN') {
      if (destination.index === source.index) return;

      // Use visibleColumns for reordering since that's what's being dragged
      const newColumnIds = Array.from(visibleColumns.map((c) => c.id));
      newColumnIds.splice(source.index, 1);
      newColumnIds.splice(destination.index, 0, draggableId);

      // If there are hidden columns (e.g., 'done' when showCompletedTasks is false),
      // we need to include them in the reorder to preserve their positions
      const hiddenColumns = kanbanColumns.filter(c => !visibleColumns.some(vc => vc.id === c.id));
      const allColumnIds = [...newColumnIds, ...hiddenColumns.map(c => c.id)];

      reorderKanbanColumns(allColumnIds);
      return;
    }

    // Task drag - same position
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

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditColumn = useCallback((column: KanbanColumnType) => {
    setEditingColumn(column);
    setIsColumnDialogOpen(true);
  }, []);

  const handleAddColumn = useCallback(() => {
    setEditingColumn(undefined);
    setIsColumnDialogOpen(true);
  }, []);

  return (
    <div className="h-full overflow-x-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-2 h-full min-h-0 min-w-max"
            >
              {visibleColumns.map((column, index) => {
                const columnTasks = filteredTasks
                  .filter((t) => t.status === column.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder);

                return (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                      >
                        <Droppable droppableId={column.id} type="TASK">
                          {(dropProvided, dropSnapshot) => (
                            <KanbanColumn
                              column={column}
                              tasks={columnTasks}
                              provided={dropProvided}
                              isDraggingOver={dropSnapshot.isDraggingOver}
                              dragHandleProps={dragProvided.dragHandleProps}
                              isDragging={dragSnapshot.isDragging}
                              onEditTask={handleEditTask}
                              onEditColumn={handleEditColumn}
                            />
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}

              {/* Add Column Button */}
              <div className="flex-shrink-0 min-w-[240px] max-w-[350px]">
                <Button
                  variant="outline"
                  className="w-full h-12 border-dashed"
                  onClick={handleAddColumn}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('kanban.addColumn')}
                </Button>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <TaskFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
      />

      <ColumnFormDialog
        open={isColumnDialogOpen}
        onOpenChange={setIsColumnDialogOpen}
        column={editingColumn}
      />
    </div>
  );
}
