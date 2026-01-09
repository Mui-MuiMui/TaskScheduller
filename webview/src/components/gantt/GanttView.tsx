import { useState, useMemo } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

type ViewMode = 'day' | 'week' | 'month';

export function GanttView() {
  const { t, locale } = useI18n();
  const { tasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today;
  });

  // Filter tasks with dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter((task) => task.startDate || task.dueDate);
  }, [tasks]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const days: Date[] = [];
    const dayCount = viewMode === 'day' ? 14 : viewMode === 'week' ? 28 : 90;
    const current = new Date(startDate);

    for (let i = 0; i < dayCount; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startDate, viewMode]);

  const cellWidth = viewMode === 'day' ? 40 : viewMode === 'week' ? 20 : 8;
  const endDate = dateRange[dateRange.length - 1];

  const getTaskPosition = (task: Task) => {
    const taskStart = task.startDate ? new Date(task.startDate) : null;
    const taskEnd = task.dueDate ? new Date(task.dueDate) : taskStart;

    if (!taskStart && !taskEnd) return null;

    const effectiveStart = taskStart || taskEnd!;
    const effectiveEnd = taskEnd || taskStart!;

    const rangeStart = startDate.getTime();
    const rangeEnd = endDate.getTime();
    const rangeTotal = rangeEnd - rangeStart;

    const taskStartTime = Math.max(effectiveStart.getTime(), rangeStart);
    const taskEndTime = Math.min(effectiveEnd.getTime(), rangeEnd);

    if (taskEndTime < rangeStart || taskStartTime > rangeEnd) return null;

    const left = ((taskStartTime - rangeStart) / rangeTotal) * 100;
    const width = ((taskEndTime - taskStartTime) / rangeTotal) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  };

  const handlePrev = () => {
    const newDate = new Date(startDate);
    const offset = viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30;
    newDate.setDate(newDate.getDate() - offset);
    setStartDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(startDate);
    const offset = viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30;
    newDate.setDate(newDate.getDate() + offset);
    setStartDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    setStartDate(today);
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          {t('message.noTasksWithDates')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            {t('action.today')}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            {t('gantt.day')}
          </Button>
          <Button
            variant={viewMode === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            {t('gantt.week')}
          </Button>
          <Button
            variant={viewMode === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            {t('gantt.month')}
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          {/* Header with dates */}
          <div className="flex border-b border-border sticky top-0 bg-background z-10">
            <div className="w-[200px] shrink-0 p-2 border-r border-border text-xs font-medium">
              {t('task.task')}
            </div>
            <div className="flex-1 flex">
              {dateRange.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const showLabel =
                  viewMode === 'day' ||
                  (viewMode === 'week' && date.getDay() === 1) ||
                  (viewMode === 'month' && date.getDate() === 1);

                return (
                  <div
                    key={index}
                    className={cn(
                      'text-center text-[10px] border-r border-border py-1',
                      isToday && 'bg-primary/20',
                      isWeekend && 'bg-muted/50'
                    )}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    {showLabel && (
                      <>
                        <div>{date.getDate()}</div>
                        <div className="text-muted-foreground">
                          {date.toLocaleDateString(locale, { month: 'short' })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows */}
          {tasksWithDates.map((task) => {
            const position = getTaskPosition(task);

            return (
              <div key={task.id} className="flex border-b border-border hover:bg-muted/30">
                <div className="w-[200px] shrink-0 p-2 border-r border-border">
                  <div className="text-xs font-medium truncate">{task.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {task.startDate && new Date(task.startDate).toLocaleDateString()}
                    {task.startDate && task.dueDate && ' - '}
                    {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex-1 relative h-[50px]">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {dateRange.map((date, index) => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div
                          key={index}
                          className={cn(
                            'border-r border-border',
                            isToday && 'bg-primary/10',
                            isWeekend && 'bg-muted/30'
                          )}
                          style={{ width: cellWidth, minWidth: cellWidth }}
                        />
                      );
                    })}
                  </div>

                  {/* Task bar */}
                  {position && (
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer transition-all hover:brightness-110',
                        task.status === 'done'
                          ? 'bg-green-500/80'
                          : task.status === 'in_progress'
                          ? 'bg-yellow-500/80'
                          : 'bg-blue-500/80'
                      )}
                      style={{
                        left: position.left,
                        width: position.width,
                        minWidth: '4px',
                      }}
                      title={`${task.title}\n${task.progress}% ${t('message.complete')}`}
                    >
                      {/* Progress indicator */}
                      <div
                        className="h-full rounded bg-white/20"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
