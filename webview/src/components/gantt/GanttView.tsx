import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import type { Task } from '@/types';

type ViewMode = 'day' | 'week' | 'month';

// Connection mode state for creating dependencies
interface ConnectionState {
  predecessorId: string;
  predecessorTaskTitle: string;
}

interface DragState {
  taskId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  initialX: number;
  currentX: number;
  initialStartDate: Date | null;
  initialEndDate: Date | null;
}

// Column data for week/month views
interface ColumnData {
  label: string;
  subLabel?: string;
  startDate: Date;
  endDate: Date;
  isCurrentPeriod: boolean;
}

export function GanttView() {
  const { t, locale } = useI18n();
  const { tasks, dependencies, updateTaskApi, createDependency, deleteDependency, showCompletedTasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today;
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  }, []);

  // Track container width for responsive sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
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

  // Fixed cell width for all view modes
  const cellWidth = 40;

  // Calculate visible columns based on container width
  const visibleColumns = useMemo(() => {
    if (containerWidth <= 0) return 10;
    return Math.max(Math.floor(containerWidth / cellWidth), 5);
  }, [containerWidth, cellWidth]);

  // Generate columns based on view mode
  const columns = useMemo((): ColumnData[] => {
    const result: ColumnData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'day') {
      // Day mode: each column is 1 day
      const current = new Date(startDate);
      for (let i = 0; i < visibleColumns; i++) {
        const dayStart = new Date(current);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);

        const dayNames = locale.startsWith('ja')
          ? ['日', '月', '火', '水', '木', '金', '土']
          : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        result.push({
          label: `${current.getDate()}`,
          subLabel: dayNames[current.getDay()],
          startDate: dayStart,
          endDate: dayEnd,
          isCurrentPeriod: current.toDateString() === today.toDateString(),
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (viewMode === 'week') {
      // Week mode: each column is 1 week
      // Start from the Monday of the start date's week
      const current = new Date(startDate);
      const dayOfWeek = current.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
      current.setDate(current.getDate() + diff);

      for (let i = 0; i < visibleColumns; i++) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const isCurrentWeek = today >= weekStart && today <= weekEnd;

        result.push({
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          subLabel: `W${getWeekNumber(weekStart)}`,
          startDate: weekStart,
          endDate: weekEnd,
          isCurrentPeriod: isCurrentWeek,
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Month mode: each column is 1 month
      const current = new Date(startDate);
      current.setDate(1); // Start from 1st of month

      for (let i = 0; i < visibleColumns; i++) {
        const monthStart = new Date(current);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

        const isCurrentMonth = today.getFullYear() === current.getFullYear() &&
          today.getMonth() === current.getMonth();

        const monthName = current.toLocaleDateString(locale, { month: 'short' });

        result.push({
          label: monthName,
          subLabel: `${current.getFullYear()}`,
          startDate: monthStart,
          endDate: monthEnd,
          isCurrentPeriod: isCurrentMonth,
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return result;
  }, [startDate, viewMode, visibleColumns, locale]);

  // Get week number
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Calculate range start/end from columns
  const rangeStart = columns[0]?.startDate || startDate;
  const rangeEnd = columns[columns.length - 1]?.endDate || startDate;
  const totalRangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const totalChartWidth = columns.length * cellWidth;

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

    // Clamp to visible range
    const taskStartTime = Math.max(effectiveStart.getTime(), rangeStart.getTime());
    const taskEndTime = Math.min(effectiveEnd.getTime(), rangeEnd.getTime());

    if (taskEndTime < rangeStart.getTime() || taskStartTime > rangeEnd.getTime()) return null;

    const leftPx = ((taskStartTime - rangeStart.getTime()) / totalRangeMs) * totalChartWidth;
    const widthPx = ((taskEndTime - taskStartTime) / totalRangeMs) * totalChartWidth;

    return {
      leftPx,
      widthPx: Math.max(widthPx, 20),
    };
  }, [rangeStart, rangeEnd, totalRangeMs, totalChartWidth]);

  const handlePrev = () => {
    const newDate = new Date(startDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 28); // 4 weeks
    } else {
      newDate.setMonth(newDate.getMonth() - 3); // 3 months
    }
    setStartDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(startDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 28);
    } else {
      newDate.setMonth(newDate.getMonth() + 3);
    }
    setStartDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    if (viewMode === 'day') {
      today.setDate(today.getDate() - 7);
    } else if (viewMode === 'week') {
      today.setDate(today.getDate() - 14);
    } else {
      today.setMonth(today.getMonth() - 1);
    }
    setStartDate(today);
  };

  // Pixels per day for drag calculations
  const pixelsPerDay = useMemo(() => {
    if (viewMode === 'day') {
      return cellWidth; // 1 cell = 1 day
    } else if (viewMode === 'week') {
      return cellWidth / 7; // 1 cell = 7 days
    } else {
      return cellWidth / 30; // 1 cell ≈ 30 days
    }
  }, [cellWidth, viewMode]);

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
    setDragState(prev => prev ? { ...prev, currentX: e.clientX } : null);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragState) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) {
      setDragState(null);
      return;
    }

    const deltaX = dragState.currentX - dragState.initialX;
    const deltaDays = Math.round(deltaX / pixelsPerDay);

    if (deltaDays === 0) {
      setDragState(null);
      return;
    }

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

    updateTaskApi(dragState.taskId, {
      startDate: newStartDate ? newStartDate.toISOString().split('T')[0] : undefined,
      dueDate: newEndDate ? newEndDate.toISOString().split('T')[0] : undefined,
    });

    setDragState(null);
  }, [dragState, tasks, updateTaskApi, pixelsPerDay]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Start connection mode (for creating dependency)
  const handleStartConnection = useCallback((task: Task) => {
    setConnectionState({
      predecessorId: task.id,
      predecessorTaskTitle: task.title,
    });
  }, []);

  // Complete connection (create dependency)
  const handleCompleteConnection = useCallback((successorId: string) => {
    if (connectionState && connectionState.predecessorId !== successorId) {
      createDependency(connectionState.predecessorId, successorId);
    }
    setConnectionState(null);
  }, [connectionState, createDependency]);

  // Cancel connection mode
  const handleCancelConnection = useCallback(() => {
    setConnectionState(null);
  }, []);

  // Get task index in the displayed list
  const taskIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tasksWithDates.forEach((task, index) => {
      map.set(task.id, index);
    });
    return map;
  }, [tasksWithDates]);

  // Calculate dependency arrow paths
  const dependencyArrows = useMemo(() => {
    const rowHeight = 56; // Height of each task row
    const barHeight = 28; // Height of the task bar
    const verticalPadding = (rowHeight - barHeight) / 2;

    return dependencies
      .filter(dep => {
        // Only show dependencies where both tasks are visible
        const predIndex = taskIndexMap.get(dep.predecessorId);
        const succIndex = taskIndexMap.get(dep.successorId);
        return predIndex !== undefined && succIndex !== undefined;
      })
      .map(dep => {
        const predTask = tasksWithDates.find(t => t.id === dep.predecessorId);
        const succTask = tasksWithDates.find(t => t.id === dep.successorId);

        if (!predTask || !succTask) return null;

        const predPos = getTaskPosition(predTask);
        const succPos = getTaskPosition(succTask);

        if (!predPos || !succPos) return null;

        const predIndex = taskIndexMap.get(dep.predecessorId)!;
        const succIndex = taskIndexMap.get(dep.successorId)!;

        // Calculate start point (right side of predecessor bar)
        const startX = predPos.leftPx + predPos.widthPx;
        const startY = predIndex * rowHeight + rowHeight / 2;

        // Calculate end point (left side of successor bar)
        const endX = succPos.leftPx;
        const endY = succIndex * rowHeight + rowHeight / 2;

        // Check if tasks overlap horizontally (predecessor ends after successor starts)
        const hasOverlap = startX > endX - 20;
        const goingDown = succIndex > predIndex;
        const sameRow = succIndex === predIndex;

        let path: string;

        if (sameRow) {
          // Same row - need to go around
          if (hasOverlap) {
            // Go below the bar
            const bottomY = startY + barHeight / 2 + 8;
            path = `M ${startX} ${startY}
                    L ${startX + 8} ${startY}
                    L ${startX + 8} ${bottomY}
                    L ${endX - 8} ${bottomY}
                    L ${endX - 8} ${endY}`;
          } else {
            // Simple horizontal line
            path = `M ${startX} ${startY} L ${endX - 8} ${endY}`;
          }
        } else if (hasOverlap) {
          // Tasks overlap horizontally - route around successor bar
          // Connect to successor from far left to avoid overlapping with the bar
          const cornerRadius = 6;
          const horizontalOffset = 12;
          // Connect to a point well left of the successor bar
          const succConnectX = Math.min(endX - 30, startX - 10);

          if (goingDown) {
            // Route: right -> down -> left (to far left of successor) -> down -> right to successor
            const midY = predIndex * rowHeight + rowHeight - verticalPadding + 8;

            path = `M ${startX} ${startY}
                    L ${startX + horizontalOffset} ${startY}
                    Q ${startX + horizontalOffset + cornerRadius} ${startY} ${startX + horizontalOffset + cornerRadius} ${startY + cornerRadius}
                    L ${startX + horizontalOffset + cornerRadius} ${midY}
                    L ${succConnectX} ${midY}
                    Q ${succConnectX - cornerRadius} ${midY} ${succConnectX - cornerRadius} ${midY + cornerRadius}
                    L ${succConnectX - cornerRadius} ${endY - cornerRadius}
                    Q ${succConnectX - cornerRadius} ${endY} ${succConnectX} ${endY}
                    L ${endX - 8} ${endY}`;
          } else {
            // Going up - route above
            const midY = predIndex * rowHeight + verticalPadding - 8;

            path = `M ${startX} ${startY}
                    L ${startX + horizontalOffset} ${startY}
                    Q ${startX + horizontalOffset + cornerRadius} ${startY} ${startX + horizontalOffset + cornerRadius} ${startY - cornerRadius}
                    L ${startX + horizontalOffset + cornerRadius} ${midY}
                    L ${succConnectX} ${midY}
                    Q ${succConnectX - cornerRadius} ${midY} ${succConnectX - cornerRadius} ${midY - cornerRadius}
                    L ${succConnectX - cornerRadius} ${endY + cornerRadius}
                    Q ${succConnectX - cornerRadius} ${endY} ${succConnectX} ${endY}
                    L ${endX - 8} ${endY}`;
          }
        } else {
          // No overlap - simple L-shape: right from predecessor, then horizontal to successor
          const cornerRadius = 6;
          const horizontalOffset = 10;
          const midX = startX + horizontalOffset + cornerRadius;

          if (goingDown) {
            // Go right, down to successor row level, then horizontal to successor
            path = `M ${startX} ${startY}
                    L ${startX + horizontalOffset} ${startY}
                    Q ${midX} ${startY} ${midX} ${startY + cornerRadius}
                    L ${midX} ${endY - cornerRadius}
                    Q ${midX} ${endY} ${midX + cornerRadius} ${endY}
                    L ${endX - 8} ${endY}`;
          } else {
            // Going up
            path = `M ${startX} ${startY}
                    L ${startX + horizontalOffset} ${startY}
                    Q ${midX} ${startY} ${midX} ${startY - cornerRadius}
                    L ${midX} ${endY + cornerRadius}
                    Q ${midX} ${endY} ${midX + cornerRadius} ${endY}
                    L ${endX - 8} ${endY}`;
          }
        }

        return {
          id: dep.id,
          path,
          endX,
          endY,
          predecessorId: dep.predecessorId,
          successorId: dep.successorId,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        path: string;
        endX: number;
        endY: number;
        predecessorId: string;
        successorId: string;
      }>;
  }, [dependencies, tasksWithDates, taskIndexMap, getTaskPosition]);

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
          {/* Header row */}
          <div className="flex border-b border-border sticky top-0 bg-background z-20">
            <div className="w-[220px] shrink-0 p-2 border-r border-border text-sm font-medium flex items-center">
              {t('task.task')}
            </div>
            <div className="flex-1 flex">
              {columns.map((col, idx) => {
                const isWeekend = viewMode === 'day' &&
                  (col.startDate.getDay() === 0 || col.startDate.getDay() === 6);

                return (
                  <div
                    key={idx}
                    className={cn(
                      'text-center text-xs border-r border-border py-1',
                      col.isCurrentPeriod && 'bg-primary/20',
                      isWeekend && 'bg-muted/50'
                    )}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    <div className="font-medium">{col.label}</div>
                    {col.subLabel && (
                      <div className={cn(
                        'text-muted-foreground',
                        isWeekend && 'text-red-400'
                      )}>
                        {col.subLabel}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows with dependency arrows overlay */}
          <div ref={chartAreaRef} className="relative">
            {/* SVG overlay for dependency arrows */}
            <svg
              className="absolute top-0 left-[220px] pointer-events-none z-10"
              style={{
                width: totalChartWidth,
                height: tasksWithDates.length * 56,
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 8 3, 0 6"
                    fill="currentColor"
                    className="text-orange-500"
                  />
                </marker>
              </defs>
              {dependencyArrows.map((arrow) => (
                <g key={arrow.id} className="pointer-events-auto">
                  <path
                    d={arrow.path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-orange-500"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Clickable area for deleting dependency */}
                  <path
                    d={arrow.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer hover:stroke-orange-500/30"
                    onClick={() => {
                      if (confirm(t('confirm.delete'))) {
                        deleteDependency(arrow.id);
                      }
                    }}
                  />
                </g>
              ))}
            </svg>

            {/* Task rows */}
            {tasksWithDates.map((task) => {
              const position = getTaskPosition(task);
              const isDragging = dragState?.taskId === task.id;
              const isConnectionSource = connectionState?.predecessorId === task.id;
              const isConnectionTarget = connectionState && connectionState.predecessorId !== task.id;

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex border-b border-border hover:bg-muted/30',
                    isConnectionTarget && 'cursor-pointer hover:bg-primary/20'
                  )}
                  onClick={() => {
                    if (isConnectionTarget) {
                      handleCompleteConnection(task.id);
                    }
                  }}
                >
                  <div className="w-[220px] shrink-0 p-3 border-r border-border flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.startDate && new Date(task.startDate).toLocaleDateString()}
                        {task.startDate && task.dueDate && ' - '}
                        {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    {/* Connect button - always visible */}
                    {!connectionState && (
                      <button
                        className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                        title={t('gantt.addDependency')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartConnection(task);
                        }}
                      >
                        <Link2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                    {isConnectionSource && (
                      <span className="shrink-0 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                        {t('gantt.connectMode')}
                      </span>
                    )}
                    {isConnectionTarget && (
                      <span className="shrink-0 text-xs text-primary">
                        {t('gantt.clickToConnect')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 relative h-[56px]">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {columns.map((col, index) => {
                        const isWeekend = viewMode === 'day' &&
                          (col.startDate.getDay() === 0 || col.startDate.getDay() === 6);

                        return (
                          <div
                            key={index}
                            className={cn(
                              'border-r border-border',
                              col.isCurrentPeriod && 'bg-primary/10',
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

                      // Define colors based on status
                      const bgColor = task.status === 'done'
                        ? 'bg-green-500/30'
                        : task.status === 'in_progress'
                        ? 'bg-yellow-500/30'
                        : task.status === 'on_hold'
                        ? 'bg-gray-500/30'
                        : 'bg-blue-500/30';

                      const progressColor = task.status === 'done'
                        ? 'bg-green-500'
                        : task.status === 'in_progress'
                        ? 'bg-yellow-500'
                        : task.status === 'on_hold'
                        ? 'bg-gray-500'
                        : 'bg-blue-500';

                      return (
                        <div
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 h-7 rounded group overflow-hidden z-[5]',
                            bgColor,
                            isDragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab hover:brightness-110',
                            isConnectionSource && 'ring-2 ring-primary ring-offset-1',
                            isConnectionTarget && 'hover:ring-2 hover:ring-primary'
                          )}
                          style={{
                            left: `${finalLeft}px`,
                            width: `${finalWidth}px`,
                          }}
                          title={`${task.title}\n${task.progress}% ${t('message.complete')}`}
                          onMouseDown={(e) => {
                            if (!connectionState) {
                              handleDragStart(e, task, 'move');
                            }
                          }}
                          onDoubleClick={(e) => {
                            if (!connectionState) {
                              e.stopPropagation();
                              handleEditTask(task);
                            }
                          }}
                          onClick={(e) => {
                            if (isConnectionTarget) {
                              e.stopPropagation();
                              handleCompleteConnection(task.id);
                            }
                          }}
                        >
                          {/* Progress indicator - filled portion */}
                          <div
                            className={cn('h-full rounded-l pointer-events-none', progressColor)}
                            style={{ width: `${task.progress}%` }}
                          />

                          {/* Left resize handle */}
                          {!connectionState && (
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
                          )}

                          {/* Right resize handle */}
                          {!connectionState && (
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
                          )}
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

      {/* Connection mode banner */}
      {connectionState && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-30">
          <span className="text-sm">
            {t('gantt.selectSuccessor').replace('{task}', connectionState.predecessorTaskTitle)}
          </span>
          <button
            className="p-1 hover:bg-primary-foreground/20 rounded"
            onClick={handleCancelConnection}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <TaskFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
