import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

type ViewMode = 'day' | 'week' | 'month';

interface DragState {
  taskId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  initialX: number;
  currentX: number;
  initialStartDate: Date | null;
  initialEndDate: Date | null;
}

export function GanttView() {
  const { t, locale } = useI18n();
  const { tasks, updateTaskApi, showCompletedTasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today;
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for responsive cell sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Subtract task column width (220px) and some padding
        setContainerWidth(containerRef.current.clientWidth - 220);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Filter tasks with dates
  const tasksWithDates = useMemo(() => {
    const filtered = showCompletedTasks ? tasks : tasks.filter(t => t.status !== 'done');
    return filtered.filter((task) => task.startDate || task.dueDate);
  }, [tasks, showCompletedTasks]);

  // Fixed cell widths per view mode
  const cellWidth = viewMode === 'day' ? 40 : viewMode === 'week' ? 20 : 20;

  // Calculate how many days can fit in the container
  const visibleDays = useMemo(() => {
    if (containerWidth <= 0) {
      // Default fallback values
      return viewMode === 'day' ? 14 : viewMode === 'week' ? 30 : 90;
    }
    const days = Math.floor(containerWidth / cellWidth);
    // Ensure at least some minimum days are shown
    return Math.max(days, 7);
  }, [containerWidth, cellWidth, viewMode]);

  // Calculate date range based on visible days
  const dateRange = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < visibleDays; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startDate, visibleDays]);

  const endDate = dateRange[dateRange.length - 1];

  // Get drag offset in pixels for a specific task
  const getDragOffset = useCallback((taskId: string, type: 'left' | 'width') => {
    if (!dragState || dragState.taskId !== taskId) return 0;

    const deltaX = dragState.currentX - dragState.initialX;

    switch (dragState.type) {
      case 'move':
        return type === 'left' ? deltaX : 0;
      case 'resize-start':
        return type === 'left' ? deltaX : (type === 'width' ? -deltaX : 0);
      case 'resize-end':
        return type === 'width' ? deltaX : 0;
      default:
        return 0;
    }
  }, [dragState]);

  const getTaskPosition = useCallback((task: Task) => {
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

    const totalWidth = dateRange.length * cellWidth;
    const leftPx = ((taskStartTime - rangeStart) / rangeTotal) * totalWidth;
    const widthPx = ((taskEndTime - taskStartTime) / rangeTotal) * totalWidth;

    return {
      leftPx,
      widthPx: Math.max(widthPx, 20),
    };
  }, [startDate, endDate, dateRange.length, cellWidth]);

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

  // Drag handlers
  const pixelsPerDay = useMemo(() => {
    return cellWidth;
  }, [cellWidth]);

  const handleDragStart = useCallback((
    e: React.MouseEvent,
    task: Task,
    type: DragState['type']
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      taskId: task.id,
      type,
      initialX: e.clientX,
      currentX: e.clientX,
      initialStartDate: task.startDate ? new Date(task.startDate) : null,
      initialEndDate: task.dueDate ? new Date(task.dueDate) : null,
    });
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;

    // Just update the currentX to track mouse position
    setDragState(prev => prev ? { ...prev, currentX: e.clientX } : null);
  }, [dragState]);

  const handleDragEnd = useCallback(() => {
    if (!dragState) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) {
      setDragState(null);
      return;
    }

    // Calculate delta in days from pixel movement
    const deltaX = dragState.currentX - dragState.initialX;
    const deltaDays = Math.round(deltaX / pixelsPerDay);

    if (deltaDays === 0) {
      setDragState(null);
      return;
    }

    // Calculate new dates from initial dates
    let newStartDate = dragState.initialStartDate ? new Date(dragState.initialStartDate) : null;
    let newEndDate = dragState.initialEndDate ? new Date(dragState.initialEndDate) : null;

    switch (dragState.type) {
      case 'move':
        if (newStartDate) {
          newStartDate.setDate(newStartDate.getDate() + deltaDays);
        }
        if (newEndDate) {
          newEndDate.setDate(newEndDate.getDate() + deltaDays);
        }
        break;

      case 'resize-start':
        if (newStartDate) {
          newStartDate.setDate(newStartDate.getDate() + deltaDays);
          if (newEndDate && newStartDate > newEndDate) {
            newStartDate = new Date(newEndDate);
          }
        }
        break;

      case 'resize-end':
        if (newEndDate) {
          newEndDate.setDate(newEndDate.getDate() + deltaDays);
          if (newStartDate && newEndDate < newStartDate) {
            newEndDate = new Date(newStartDate);
          }
        }
        break;
    }

    // Send update to backend
    updateTaskApi(dragState.taskId, {
      startDate: newStartDate ? newStartDate.toISOString().split('T')[0] : undefined,
      dueDate: newEndDate ? newEndDate.toISOString().split('T')[0] : undefined,
    });

    setDragState(null);
  }, [dragState, tasks, updateTaskApi, pixelsPerDay]);

  // Global mouse event handlers for drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState) {
      handleDragMove(e);
    }
  }, [dragState, handleDragMove]);

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      handleDragEnd();
    }
  }, [dragState, handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      handleDragEnd();
    }
  }, [dragState, handleDragEnd]);

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-base">
          {t('message.noTasksWithDates')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="default" onClick={handleToday}>
            {t('action.today')}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'day' ? 'secondary' : 'ghost'}
            size="default"
            onClick={() => setViewMode('day')}
          >
            {t('gantt.day')}
          </Button>
          <Button
            variant={viewMode === 'week' ? 'secondary' : 'ghost'}
            size="default"
            onClick={() => setViewMode('week')}
          >
            {t('gantt.week')}
          </Button>
          <Button
            variant={viewMode === 'month' ? 'secondary' : 'ghost'}
            size="default"
            onClick={() => setViewMode('month')}
          >
            {t('gantt.month')}
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="min-w-[600px]">
          {/* Header with dates - Month row */}
          <div className="flex border-b border-border sticky top-0 bg-background z-20">
            <div className="w-[220px] shrink-0 p-2 border-r border-border text-sm font-medium flex items-center">
              {t('task.task')}
            </div>
            <div className="flex-1 flex">
              {(() => {
                // Group dates by month for month header
                const monthGroups: { month: string; count: number; year: number }[] = [];
                let currentMonth = '';
                let currentYear = 0;

                dateRange.forEach((date) => {
                  const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                  const monthName = date.toLocaleDateString(locale, { month: 'short' });

                  if (monthKey !== currentMonth) {
                    currentMonth = monthKey;
                    currentYear = date.getFullYear();
                    monthGroups.push({ month: monthName, count: 1, year: currentYear });
                  } else {
                    monthGroups[monthGroups.length - 1].count++;
                  }
                });

                return monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-medium border-r border-border py-1 bg-muted/30"
                    style={{ width: group.count * cellWidth, minWidth: group.count * cellWidth }}
                  >
                    {group.month} {group.year}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Header with dates - Day row */}
          <div className="flex border-b border-border sticky top-[28px] bg-background z-10">
            <div className="w-[220px] shrink-0 border-r border-border" />
            <div className="flex-1 flex" ref={chartAreaRef}>
              {dateRange.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayNames = locale.startsWith('ja')
                  ? ['日', '月', '火', '水', '木', '金', '土']
                  : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

                return (
                  <div
                    key={index}
                    className={cn(
                      'text-center text-xs border-r border-border py-1',
                      isToday && 'bg-primary/20',
                      isWeekend && 'bg-muted/50'
                    )}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    <div className="font-medium">{date.getDate()}</div>
                    <div className={cn(
                      'text-muted-foreground',
                      isWeekend && 'text-red-400'
                    )}>
                      {dayNames[date.getDay()]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows */}
          {tasksWithDates.map((task) => {
            const position = getTaskPosition(task);
            const isDragging = dragState?.taskId === task.id;

            return (
              <div key={task.id} className="flex border-b border-border hover:bg-muted/30">
                <div className="w-[220px] shrink-0 p-3 border-r border-border">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {task.startDate && new Date(task.startDate).toLocaleDateString()}
                    {task.startDate && task.dueDate && ' - '}
                    {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex-1 relative h-[56px]">
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
                  {position && (() => {
                    const leftOffset = getDragOffset(task.id, 'left');
                    const widthOffset = getDragOffset(task.id, 'width');
                    const finalLeft = position.leftPx + leftOffset;
                    const finalWidth = Math.max(position.widthPx + widthOffset, 20);

                    return (
                      <div
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2 h-7 rounded group',
                          task.status === 'done'
                            ? 'bg-green-500/80'
                            : task.status === 'in_progress'
                            ? 'bg-yellow-500/80'
                            : 'bg-blue-500/80',
                          isDragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab hover:brightness-110'
                        )}
                        style={{
                          left: `${finalLeft}px`,
                          width: `${finalWidth}px`,
                        }}
                        title={`${task.title}\n${task.progress}% ${t('message.complete')}`}
                        onMouseDown={(e) => handleDragStart(e, task, 'move')}
                      >
                        {/* Progress indicator */}
                        <div
                          className="h-full rounded bg-white/20 pointer-events-none"
                          style={{ width: `${task.progress}%` }}
                        />

                        {/* Left resize handle */}
                        <div
                          className={cn(
                            'absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'hover:bg-white/30 rounded-l'
                          )}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, task, 'resize-start');
                          }}
                        />

                        {/* Right resize handle */}
                        <div
                          className={cn(
                            'absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'hover:bg-white/30 rounded-r'
                          )}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, task, 'resize-end');
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
