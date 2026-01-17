import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import './calendar.css';
import { useTaskStore } from '@/stores/taskStore';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import type { Task } from '@/types';
import { getHexColor } from '@/types';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week';
type WeekStartDay = 0 | 1; // 0 = Sunday, 1 = Monday

interface TaskBar {
  task: Task;
  startCol: number;
  span: number;
  row: number;
}

interface DragState {
  task: Task;
  originalStartDate: Date;
  originalEndDate: Date;
}

export function CalendarView() {
  const { t, locale } = useI18n();
  const { tasks, kanbanColumns, updateTaskApi } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(() => {
    const saved = localStorage.getItem('calendar-week-start');
    return (saved === '0' || saved === '1') ? parseInt(saved) as WeekStartDay : 0;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const weekRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollUpdateTimeoutRef = useRef<number | null>(null);
  const hasScrolledToToday = useRef(false);
  const WEEK_HEIGHT = 150; // Height of each week row in pixels

  // Get status color from kanban columns
  const getStatusColor = useCallback((status: string): string => {
    const column = kanbanColumns.find(col => col.id === status);
    return column?.color || 'bg-gray-500';
  }, [kanbanColumns]);

  // Filter tasks with dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter((task) => task.startDate || task.dueDate);
  }, [tasks]);

  // Toggle week start day setting
  const handleWeekStartToggle = () => {
    const newValue: WeekStartDay = weekStartDay === 0 ? 1 : 0;
    setWeekStartDay(newValue);
    localStorage.setItem('calendar-week-start', String(newValue));
  };

  // Generate multiple months for continuous scrolling
  const calendarGrid = useMemo(() => {
    if (viewMode === 'week') {
      // Week view: show one week based on displayMonth
      const startDate = new Date(displayMonth);
      const dayOfWeek = startDate.getDay();
      const diff = weekStartDay === 0
        ? (dayOfWeek === 0 ? 0 : -dayOfWeek)
        : (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      startDate.setDate(startDate.getDate() + diff);

      const days: Date[] = [];
      const current = new Date(startDate);

      for (let i = 0; i < 7; i++) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      return {
        days,
        columns: 7,
        weeks: [{ days, month: displayMonth.getMonth(), year: displayMonth.getFullYear() }]
      };
    }

    // Month view: generate multiple months (3 before, current, 3 after = 7 months)
    const weeks: Array<{ days: Date[], month: number, year: number }> = [];
    const addedWeekKeys = new Set<string>(); // Track added weeks to prevent duplicates
    const currentYear = displayMonth.getFullYear();
    const currentMonth = displayMonth.getMonth();

    for (let monthOffset = -3; monthOffset <= 3; monthOffset++) {
      const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);

      // Adjust to start from configured week start day
      const startDate = new Date(firstDay);
      const dayOfWeek = startDate.getDay();
      const diff = weekStartDay === 0
        ? (dayOfWeek === 0 ? 0 : -dayOfWeek)
        : (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      startDate.setDate(startDate.getDate() + diff);

      // Generate weeks for this month
      const current = new Date(startDate);
      let weekCount = 0;
      const maxWeeks = 6; // Maximum weeks in a month view

      while (weekCount < maxWeeks && current <= lastDay) {
        const weekDays: Date[] = [];
        const weekStart = new Date(current);

        for (let i = 0; i < 7; i++) {
          weekDays.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }

        // Create unique key for this week based on its first day
        const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;

        // Only add week if it contains days from target month AND hasn't been added yet
        const hasTargetMonth = weekDays.some(d => d.getMonth() === targetMonth);
        if (hasTargetMonth && !addedWeekKeys.has(weekKey)) {
          weeks.push({ days: weekDays, month: targetMonth, year: targetYear });
          addedWeekKeys.add(weekKey);
          weekCount++;
        }

        // Break if the week doesn't contain any days from target month
        if (!hasTargetMonth) {
          break;
        }
      }
    }

    const allDays = weeks.flatMap(w => w.days);
    return { days: allDays, columns: 7, weeks };
  }, [displayMonth, viewMode, weekStartDay]);

  // Scroll to today's week on initial load
  useEffect(() => {
    if (viewMode !== 'month' || !containerRef.current || hasScrolledToToday.current) return;
    if (weekRefs.current.size === 0) return;

    // Find the week containing today
    const todayWeek = Array.from(weekRefs.current.entries()).find(([key]) => {
      const week = calendarGrid.weeks.find(w => {
        const firstDay = w.days[0];
        return `${firstDay.getFullYear()}-${firstDay.getMonth()}-${firstDay.getDate()}` === key;
      });
      if (!week) return false;
      return week.days.some(d => d.toDateString() === today.toDateString());
    });

    if (todayWeek) {
      const [, element] = todayWeek;
      element.scrollIntoView({ block: 'center', behavior: 'auto' });
      hasScrolledToToday.current = true;
    }
  }, [calendarGrid.weeks, viewMode, today]);

  // Custom wheel handler for month view to scroll by week height
  useEffect(() => {
    if (viewMode !== 'month' || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      // Determine scroll direction and amount
      const delta = e.deltaY;
      const scrollAmount = delta > 0 ? WEEK_HEIGHT : -WEEK_HEIGHT;

      // Smooth scroll by week height
      container.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode]);

  // Monitor scroll position to update displayed month - simplified approach
  useEffect(() => {
    if (viewMode !== 'month' || !containerRef.current) return;

    const handleScroll = () => {
      if (scrollUpdateTimeoutRef.current !== null) {
        clearTimeout(scrollUpdateTimeoutRef.current);
      }

      scrollUpdateTimeoutRef.current = window.setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const viewportCenter = containerRect.top + 200; // Check 200px from top

        let targetMonth: { year: number; month: number } | null = null;
        let minDistance = Infinity;

        // Find which week is most visible at the center
        weekRefs.current.forEach((element) => {
          const rect = element.getBoundingClientRect();

          // Check if this week is visible
          if (rect.bottom >= containerRect.top && rect.top <= containerRect.bottom) {
            const weekCenter = (rect.top + rect.bottom) / 2;
            const distance = Math.abs(weekCenter - viewportCenter);

            if (distance < minDistance) {
              minDistance = distance;
              const month = parseInt(element.getAttribute('data-week-month') || '0', 10);
              const year = parseInt(element.getAttribute('data-week-year') || '0', 10);
              targetMonth = { year, month };
            }
          }
        });

        if (targetMonth) {
          const { year, month } = targetMonth;
          setDisplayMonth(prev => {
            if (prev.getFullYear() !== year || prev.getMonth() !== month) {
              return new Date(year, month, 1);
            }
            return prev;
          });
        }
      }, 150); // Debounce 150ms
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollUpdateTimeoutRef.current !== null) {
        clearTimeout(scrollUpdateTimeoutRef.current);
      }
    };
  }, [calendarGrid.weeks, viewMode]);

  // Calculate task bars for the visible date range
  const taskBars = useMemo(() => {
    if (calendarGrid.days.length === 0) return [];

    const startDate = new Date(calendarGrid.days[0]);
    const endDate = new Date(calendarGrid.days[calendarGrid.days.length - 1]);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const bars: TaskBar[] = [];
    const taskRows: Task[][] = [];

    // Sort tasks: longer duration first, then earlier start date
    const sortedTasks = [...tasksWithDates].sort((a, b) => {
      const aStart = a.startDate ? new Date(a.startDate) : new Date(a.dueDate!);
      const aEnd = a.dueDate ? new Date(a.dueDate) : new Date(a.startDate!);
      const bStart = b.startDate ? new Date(b.startDate) : new Date(b.dueDate!);
      const bEnd = b.dueDate ? new Date(b.dueDate) : new Date(b.startDate!);

      aStart.setHours(0, 0, 0, 0);
      aEnd.setHours(0, 0, 0, 0);
      bStart.setHours(0, 0, 0, 0);
      bEnd.setHours(0, 0, 0, 0);

      const aDuration = aEnd.getTime() - aStart.getTime();
      const bDuration = bEnd.getTime() - bStart.getTime();

      if (aDuration !== bDuration) {
        return bDuration - aDuration;
      }
      return aStart.getTime() - bStart.getTime();
    });

    sortedTasks.forEach(task => {
      const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
      const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);

      taskStart.setHours(0, 0, 0, 0);
      taskEnd.setHours(0, 0, 0, 0);

      // Check if task overlaps with visible range
      if (taskEnd < startDate || taskStart > endDate) {
        return;
      }

      const visibleStart = new Date(Math.max(taskStart.getTime(), startDate.getTime()));
      const visibleEnd = new Date(Math.min(taskEnd.getTime(), endDate.getTime()));

      const startCol = calendarGrid.days.findIndex(d => {
        const dayDate = new Date(d);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === visibleStart.getTime();
      });
      const endCol = calendarGrid.days.findIndex(d => {
        const dayDate = new Date(d);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === visibleEnd.getTime();
      });

      if (startCol === -1 || endCol === -1) {
        return;
      }

      const span = endCol - startCol + 1;

      let row = 0;
      while (row < taskRows.length) {
        const rowTasks = taskRows[row];
        const hasOverlap = rowTasks.some(t => {
          const tStart = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
          const tEnd = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate!);
          tStart.setHours(0, 0, 0, 0);
          tEnd.setHours(0, 0, 0, 0);
          return !(taskEnd < tStart || taskStart > tEnd);
        });
        if (!hasOverlap) {
          break;
        }
        row++;
      }

      if (row === taskRows.length) {
        taskRows.push([]);
      }
      taskRows[row].push(task);

      bars.push({
        task,
        startCol,
        span,
        row,
      });
    });

    return bars;
  }, [calendarGrid.days, tasksWithDates, displayMonth, viewMode, weekStartDay]);

  const handleToday = () => {
    const now = new Date();
    setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    if (viewMode === 'month') {
      hasScrolledToToday.current = false;
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      const newDate = new Date(displayMonth);
      newDate.setDate(newDate.getDate() - 7);
      setDisplayMonth(newDate);
    } else {
      const newDate = new Date(displayMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      setDisplayMonth(newDate);
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const newDate = new Date(displayMonth);
      newDate.setDate(newDate.getDate() + 7);
      setDisplayMonth(newDate);
    } else {
      const newDate = new Date(displayMonth);
      newDate.setMonth(newDate.getMonth() + 1);
      setDisplayMonth(newDate);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleDateClick = () => {
    setIsCreateDialogOpen(true);
  };

  // Drag and drop handlers
  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);

    setDragState({
      task,
      originalStartDate: taskStart,
      originalEndDate: taskEnd,
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDateDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();

    if (!dragState) return;

    const duration = dragState.originalEndDate.getTime() - dragState.originalStartDate.getTime();
    const newStartDate = new Date(targetDate);
    newStartDate.setHours(0, 0, 0, 0);
    const newEndDate = new Date(newStartDate.getTime() + duration);

    updateTaskApi(dragState.task.id, {
      startDate: newStartDate.toISOString().split('T')[0],
      dueDate: newEndDate.toISOString().split('T')[0],
    });

    setDragState(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Format month/week label
  const formatLabel = () => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth() + 1;

    if (viewMode === 'month') {
      if (locale === 'ja') {
        return `${year}年 ${month}月`;
      } else {
        return displayMonth.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
      }
    } else {
      const startDate = calendarGrid.days[0];
      const endDate = calendarGrid.days[6];
      if (locale === 'ja') {
        return `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`;
      } else {
        return `${startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
      }
    }
  };

  const dayNames = useMemo(() => {
    const names = locale === 'ja'
      ? ['日', '月', '火', '水', '木', '金', '土']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (weekStartDay === 1) {
      return [...names.slice(1), names[0]];
    }
    return names;
  }, [locale, weekStartDay]);

  const maxRows = Math.max(taskBars.reduce((max, bar) => Math.max(max, bar.row + 1), 0), 1);

  return (
    <div className="flex flex-col h-full p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            {t('calendar.today')}
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{formatLabel()}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            title={t('action.settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('month');
              hasScrolledToToday.current = false;
            }}
          >
            {t('calendar.month')}
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            {t('calendar.week')}
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-4 p-3 border border-border rounded bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {locale === 'ja' ? '週の開始曜日' : 'Week starts on'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWeekStartToggle}
            >
              {weekStartDay === 0
                ? (locale === 'ja' ? '日曜日' : 'Sunday')
                : (locale === 'ja' ? '月曜日' : 'Monday')
              }
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 border border-border rounded flex flex-col overflow-hidden min-w-[700px]">
        {/* Day names header - only for month view */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 border-b border-border bg-background shrink-0">
            {dayNames.map((day, idx) => {
              const actualDayIdx = weekStartDay === 0 ? idx : (idx + 1) % 7;
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-2 text-center text-sm font-medium border-r border-border last:border-r-0 bg-background',
                    actualDayIdx === 0 && 'text-red-500',
                    actualDayIdx === 6 && 'text-blue-500'
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'week' && (
          <>
            {/* Day names header for week view */}
            <div className="grid grid-cols-7 border-b border-border bg-background shrink-0">
              {dayNames.map((day, idx) => {
                const actualDayIdx = weekStartDay === 0 ? idx : (idx + 1) % 7;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'p-2 text-center text-sm font-medium border-r border-border last:border-r-0 bg-background',
                      actualDayIdx === 0 && 'text-red-500',
                      actualDayIdx === 6 && 'text-blue-500'
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            {/* Date numbers for week view */}
            <div className="grid grid-cols-7 border-b border-border bg-background shrink-0">
              {calendarGrid.days.map((date, colIdx) => {
                const isToday = date.toDateString() === today.toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={colIdx}
                    className={cn(
                      'border-r border-border last:border-r-0 p-2 text-center cursor-pointer transition-colors hover:bg-muted/50',
                      isToday && 'bg-primary/10',
                      isWeekend && 'bg-muted/10'
                    )}
                    onClick={handleDateClick}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDateDrop(e, date)}
                  >
                    <div className={cn(
                      'text-lg font-bold',
                      isToday && 'text-primary'
                    )}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div
          ref={containerRef}
          className={cn(
            "flex-1 overflow-auto calendar-scroll-container",
            viewMode === 'month' && 'month-view'
          )}
        >
          <div>
            {/* Continuous weeks for month view or single week for week view */}
            {viewMode === 'month' ? (
              <div className="flex-1">
              {calendarGrid.weeks.map((week, weekIdx) => {
                // Use first day of week as unique key
                const firstDay = week.days[0];
                const weekKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}-${firstDay.getDate()}`;
                const weekStartCol = weekIdx * 7;
                const weekBars = taskBars.filter(bar => {
                  return bar.startCol >= weekStartCol && bar.startCol < weekStartCol + 7 ||
                    bar.startCol < weekStartCol && bar.startCol + bar.span > weekStartCol;
                });
                const weekMaxRows = Math.max(weekBars.reduce((max, bar) => Math.max(max, bar.row + 1), 0), 1);

                return (
                  <div
                    key={weekKey}
                    ref={el => {
                      if (el) weekRefs.current.set(weekKey, el);
                      else weekRefs.current.delete(weekKey);
                    }}
                    data-week-key={weekKey}
                    data-week-month={week.month}
                    data-week-year={week.year}
                    className="border-b border-border last:border-b-0"
                    style={{ height: `${WEEK_HEIGHT}px` }}
                  >
                    {/* Date numbers */}
                    <div className="grid grid-cols-7 relative calendar-date-row">
                      {week.days.map((date, colIdx) => {
                        const isToday = date.toDateString() === today.toDateString();
                        const isCurrentMonth = date.getMonth() === week.month;
                        const dateMonth = date.getMonth();
                        const isDateEvenMonth = dateMonth % 2 === 0;

                        return (
                          <div
                            key={colIdx}
                            className={cn(
                              'border-r border-border last:border-r-0 p-1 cursor-pointer transition-colors hover:bg-muted/50 h-8',
                              // Base color by month (even/odd)
                              isDateEvenMonth ? 'bg-muted/40' : 'bg-background',
                              // Dim non-current month
                              !isCurrentMonth && 'text-muted-foreground',
                              // Highlight today (overrides month color)
                              isToday && 'bg-primary/30'
                            )}
                            onClick={handleDateClick}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDateDrop(e, date)}
                          >
                            <div className={cn(
                              'text-sm font-medium',
                              isToday && 'text-primary font-bold'
                            )}>
                              {date.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Task bars */}
                    <div className="relative overflow-y-auto" style={{ height: '118px' }}>
                      {/* Background columns with month-based colors */}
                      <div className="absolute inset-0 grid grid-cols-7">
                        {week.days.map((date, colIdx) => {
                          const dateMonth = date.getMonth();
                          const isDateEvenMonth = dateMonth % 2 === 0;
                          return (
                            <div
                              key={colIdx}
                              className={cn(
                                'border-r border-border last:border-r-0',
                                isDateEvenMonth && 'bg-muted/40'
                              )}
                            />
                          );
                        })}
                      </div>
                      <div className="absolute inset-0 pt-1" style={{ minHeight: `${weekMaxRows * 28 + 4}px` }}>
                        {weekBars.map((bar, idx) => {
                          const statusColor = getStatusColor(bar.task.status);
                          const hexColor = getHexColor(statusColor);
                          const globalCol = bar.startCol;
                          const localStartCol = Math.max(0, globalCol - weekStartCol);
                          const localEndCol = Math.min(6, globalCol + bar.span - 1 - weekStartCol);
                          const localSpan = localEndCol - localStartCol + 1;

                          if (localSpan <= 0) return null;

                          return (
                            <div
                              key={idx}
                              draggable
                              onDragStart={(e) => handleTaskDragStart(e, bar.task)}
                              className="absolute px-1 py-0.5 text-xs rounded cursor-move hover:opacity-80 truncate"
                              style={{
                                left: `${(localStartCol / 7) * 100}%`,
                                width: `${(localSpan / 7) * 100}%`,
                                top: `${bar.row * 28 + 4}px`,
                                height: '24px',
                                backgroundColor: hexColor,
                                color: '#ffffff',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(bar.task);
                              }}
                              title={bar.task.title}
                            >
                              {bar.task.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Week view
            <div className="flex-1 relative grid grid-cols-7" style={{ minHeight: `${maxRows * 32 + 4}px` }}>
                {calendarGrid.days.map((date, colIdx) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={colIdx}
                      className={cn(
                        'border-r border-border last:border-r-0',
                        isWeekend && 'bg-muted/10'
                      )}
                    />
                  );
                })}
                {taskBars.map((bar, idx) => {
                  const statusColor = getStatusColor(bar.task.status);
                  const hexColor = getHexColor(statusColor);

                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, bar.task)}
                      className="absolute px-2 py-1 text-sm rounded cursor-move hover:opacity-80 truncate"
                      style={{
                        left: `${(bar.startCol / 7) * 100}%`,
                        width: `${(bar.span / 7) * 100}%`,
                        top: `${bar.row * 32}px`,
                        height: '28px',
                        backgroundColor: hexColor,
                        color: '#ffffff',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(bar.task);
                      }}
                      title={bar.task.title}
                    >
                      {bar.task.title}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Task Dialog */}
      {selectedTask && (
        <TaskFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          task={selectedTask}
        />
      )}

      {/* Create Task Dialog */}
      <TaskFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
