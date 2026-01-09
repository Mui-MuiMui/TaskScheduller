import { useEffect, useState } from 'react';
import { useTaskStore, initializeMessageHandler } from '@/stores/taskStore';
import { Tabs, TabsList, TabsTrigger, TabsContent, Checkbox, Label } from '@/components/ui';
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
  const { currentView, setCurrentView, isLoading, showCompletedTasks, setShowCompletedTasks } = useTaskStore();
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
        <div className="text-muted-foreground text-base">{t('message.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-3">
      <Tabs
        value={currentView}
        onValueChange={(value) => setCurrentView(value as ViewType)}
        className="flex flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <TabsList className="h-10">
            <TabsTrigger value="todo" className="gap-2 px-4 py-2 text-sm">
              <ListTodo className="h-5 w-5" />
              <span className="hidden sm:inline">{t('view.todo')}</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2 px-4 py-2 text-sm">
              <Columns3 className="h-5 w-5" />
              <span className="hidden sm:inline">{t('view.kanban')}</span>
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2 px-4 py-2 text-sm">
              <GanttChart className="h-5 w-5" />
              <span className="hidden sm:inline">{t('view.gantt')}</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-completed"
                checked={showCompletedTasks}
                onCheckedChange={(checked) => setShowCompletedTasks(checked === true)}
              />
              <Label htmlFor="show-completed" className="text-sm cursor-pointer">
                {t('filter.showCompleted')}
              </Label>
            </div>

            <Button size="default" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline ml-1">{t('action.newTask')}</span>
            </Button>
          </div>
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
