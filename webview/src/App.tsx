import { useEffect, useState } from 'react';
import { useTaskStore, initializeMessageHandler } from '@/stores/taskStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { TodoView } from '@/components/todo/TodoView';
import { KanbanView } from '@/components/kanban/KanbanView';
import { GanttView } from '@/components/gantt/GanttView';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import { ListTodo, Columns3, GanttChart, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { ViewType } from '@/types';

function App() {
  const { t } = useI18n();
  const { currentView, setCurrentView, isLoading } = useTaskStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    // Initialize message handler and listen for messages
    const cleanup = initializeMessageHandler();

    // Listen for create task dialog command
    const handleOpenDialog = () => setIsCreateDialogOpen(true);
    window.addEventListener('openCreateTaskDialog', handleOpenDialog);

    return () => {
      cleanup();
      window.removeEventListener('openCreateTaskDialog', handleOpenDialog);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">{t('message.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-2">
      <Tabs
        value={currentView}
        onValueChange={(value) => setCurrentView(value as ViewType)}
        className="flex flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <TabsList>
            <TabsTrigger value="todo" className="gap-1">
              <ListTodo className="h-3 w-3" />
              <span className="hidden sm:inline">{t('view.todo')}</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1">
              <Columns3 className="h-3 w-3" />
              <span className="hidden sm:inline">{t('view.kanban')}</span>
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-1">
              <GanttChart className="h-3 w-3" />
              <span className="hidden sm:inline">{t('view.gantt')}</span>
            </TabsTrigger>
          </TabsList>

          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">{t('action.newTask')}</span>
          </Button>
        </div>

        <TabsContent value="todo" className="flex-1 overflow-auto mt-0">
          <TodoView />
        </TabsContent>

        <TabsContent value="kanban" className="flex-1 overflow-auto mt-0">
          <KanbanView />
        </TabsContent>

        <TabsContent value="gantt" className="flex-1 overflow-auto mt-0">
          <GanttView />
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}

export default App;
