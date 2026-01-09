import { useState } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { TodoItem } from './TodoItem';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import type { Task } from '@/types';

export function TodoView() {
  const { t } = useI18n();
  const { tasks } = useTaskStore();
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

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('message.noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sortedTasks.map((task) => (
        <TodoItem key={task.id} task={task} onEdit={() => handleEditTask(task)} />
      ))}

      <TaskFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
