import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { Button, Tooltip, TooltipTrigger, TooltipContent, Checkbox } from '@/components/ui';
import { FilterPopover } from '@/components/common/FilterPopover';
import { ChevronLeft, ChevronRight, Link2, X, FolderOpen, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskFormDialog } from '@/components/common/TaskFormDialog';
import type { Task, KanbanColumn, FilterState } from '@/types';
import { getHexColor, createEmptyFilterState, evaluateFilter, loadFilterState } from '@/types';

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

// Row drag state for reordering tasks
interface RowDragState {
  taskId: string;
  initialIndex: number;
  currentIndex: number;
}

// Column data for week/month views
interface ColumnData {
  label: string;
  subLabel?: string;
  startDate: Date;
  endDate: Date;
  isCurrentPeriod: boolean;
}

// Component that shows tooltip only when text is truncated or has description
const TruncatedTaskInfo = React.memo(function TruncatedTaskInfo({
  task,
  children,
  className
}: {
  task: Task;
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      // Check if any text is truncated
      const titleEl = el.querySelector('.truncate');
      if (titleEl) {
        setIsTruncated(titleEl.scrollWidth > titleEl.clientWidth || !!task.description);
      }
    }
  }, [task.title, task.description]);

  const showTooltip = isTruncated || !!task.description;

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div ref={containerRef} className={className}>{children}</div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="font-medium">{task.title}</div>
          {task.description && <div className="text-muted-foreground mt-1">{task.description}</div>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div ref={containerRef} className={className}>{children}</div>;
});

export function GanttView() {
  const { t, locale } = useI18n();
  const { tasks, dependencies, updateTaskApi, createDependency, deleteDependency, showCompletedTasks, currentProjectId, projects, reorderTasks, kanbanColumns, createTask } = useTaskStore();

  // Helper function to get column color for a task status
  const getColumnColor = useCallback((status: string): string => {
    const column = kanbanColumns.find((col: KanbanColumn) => col.id === status);
    return column?.color || 'bg-blue-500'; // fallback to blue
  }, [kanbanColumns]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today;
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [rowDragState, setRowDragState] = useState<RowDragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [filterState, setFilterState] = useState<FilterState>(() => {
    const saved = loadFilterState('taskscheduller-filters-gantt');
    return saved || createEmptyFilterState();
  });
  const [highlightToday, setHighlightToday] = useState(() => {
    const saved = localStorage.getItem('gantt-highlight-today');
    return saved ? JSON.parse(saved) : true;
  });

  // Task column width (resizable) - load from localStorage
  const TASK_COLUMN_MIN_WIDTH = 150;
  const TASK_COLUMN_DEFAULT_WIDTH = 220;
  const TASK_COLUMN_MAX_WIDTH = 400;
  const [taskColumnWidth, setTaskColumnWidth] = useState(() => {
    const saved = localStorage.getItem('gantt-task-column-width');
    if (saved) {
      const width = parseInt(saved, 10);
      if (!isNaN(width) && width >= TASK_COLUMN_MIN_WIDTH && width <= TASK_COLUMN_MAX_WIDTH) {
        return width;
      }
    }
    return TASK_COLUMN_DEFAULT_WIDTH;
  });
  const columnResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  }, []);

  // Track Ctrl key state for copy on drag
  const ctrlKeyRef = useRef(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {ctrlKeyRef.current = true;}
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {ctrlKeyRef.current = false;}
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Track container width for responsive sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - taskColumnWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [taskColumnWidth]);

  // Handle column resize
  const handleColumnResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    columnResizeRef.current = { startX: e.clientX, startWidth: taskColumnWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!columnResizeRef.current) {return;}
      const delta = moveEvent.clientX - columnResizeRef.current.startX;
      const newWidth = Math.min(TASK_COLUMN_MAX_WIDTH, Math.max(TASK_COLUMN_MIN_WIDTH, columnResizeRef.current.startWidth + delta));
      setTaskColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (columnResizeRef.current) {
        // Save to localStorage
        const currentWidth = Math.min(TASK_COLUMN_MAX_WIDTH, Math.max(TASK_COLUMN_MIN_WIDTH, taskColumnWidth));
        localStorage.setItem('gantt-task-column-width', String(currentWidth));
      }
      columnResizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [taskColumnWidth]);

  // Filter tasks with dates
  const filteredByCompletion = showCompletedTasks ? tasks : tasks.filter(t => t.status !== 'done');
  const filteredByFilter = filteredByCompletion.filter(t => evaluateFilter(t, filterState));
  const tasksWithDates = filteredByFilter.filter((task) => task.startDate || task.dueDate);

  // Fixed cell width for all view modes
  const cellWidth = 40;

  // Calculate visible columns based on container width
  const visibleColumns = useMemo(() => {
    if (containerWidth <= 0) {return 10;}
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
    if (!dragState || dragState.taskId !== taskId) {return 0;}

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

    if (!taskStart && !taskEnd) {return null;}

    const effectiveStart = taskStart || taskEnd!;
    const effectiveEnd = taskEnd || taskStart!;

    // Clamp to visible range
    const taskStartTime = Math.max(effectiveStart.getTime(), rangeStart.getTime());
    const taskEndTime = Math.min(effectiveEnd.getTime(), rangeEnd.getTime());

    if (taskEndTime < rangeStart.getTime() || taskStartTime > rangeEnd.getTime()) {return null;}

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
    if (!dragState) {return;}

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

  // Handle highlight today toggle
  const handleHighlightTodayChange = useCallback((checked: boolean) => {
    setHighlightToday(checked);
    localStorage.setItem('gantt-highlight-today', JSON.stringify(checked));
  }, []);

  // Row drag handlers for reordering tasks
  const handleRowDragStart = useCallback((e: React.DragEvent, taskId: string, index: number) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', taskId);
    setRowDragState({
      taskId,
      initialIndex: index,
      currentIndex: index,
    });
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setRowDragState(prev => prev ? { ...prev, currentIndex: index } : null);
  }, []);

  const handleRowDragEnd = useCallback(() => {
    if (!rowDragState) {return;}

    const { initialIndex, currentIndex } = rowDragState;
    const draggedTask = tasksWithDates[initialIndex];

    // Ctrl+ドラッグで複製
    if (ctrlKeyRef.current && draggedTask) {
      const duplicateData = {
        projectId: draggedTask.projectId || undefined,
        title: draggedTask.title,
        description: draggedTask.description || undefined,
        status: draggedTask.status,
        priority: draggedTask.priority,
        dueDate: draggedTask.dueDate || undefined,
        startDate: draggedTask.startDate || undefined,
        assignee: draggedTask.assignee || undefined,
        estimatedHours: draggedTask.estimatedHours || undefined,
        progress: 0, // 進捗は0にリセット
      };
      // ドロップ位置の直前のタスクIDを取得（その後ろに挿入）
      const targetTask = tasksWithDates[currentIndex];
      const insertAfterTaskId = currentIndex > 0
        ? (initialIndex < currentIndex ? targetTask?.id : tasksWithDates[currentIndex - 1]?.id)
        : undefined;
      createTask(duplicateData, undefined, insertAfterTaskId || draggedTask.id);
      setRowDragState(null);
      return;
    }

    if (initialIndex !== currentIndex) {
      // Get all tasks sorted by sortOrder (not just tasksWithDates)
      const allTasksSorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
      const allTaskIds = allTasksSorted.map(t => t.id);

      // Get the dragged task
      const targetTask = tasksWithDates[currentIndex];

      // Find positions in the global list
      const currentGlobalIndex = allTaskIds.indexOf(draggedTask.id);
      const targetGlobalIndex = allTaskIds.indexOf(targetTask.id);

      // Remove from current position
      allTaskIds.splice(currentGlobalIndex, 1);

      // Insert at new position (adjust if needed after removal)
      const adjustedTargetIndex = currentGlobalIndex < targetGlobalIndex
        ? targetGlobalIndex
        : targetGlobalIndex;

      if (initialIndex < currentIndex) {
        // Moving down - insert after target
        allTaskIds.splice(adjustedTargetIndex, 0, draggedTask.id);
      } else {
        // Moving up - insert before target
        const insertIndex = allTaskIds.indexOf(targetTask.id);
        allTaskIds.splice(insertIndex, 0, draggedTask.id);
      }

      // Reorder all tasks globally
      reorderTasks(allTaskIds);
    }

    setRowDragState(null);
  }, [rowDragState, tasksWithDates, tasks, reorderTasks, createTask]);

  // Calculate dependency arrow paths
  // Use taller rows in All Tasks mode to accommodate project indicator
  const rowHeight = currentProjectId === null ? 72 : 56;
  const barHeight = 28; // Height of the task bar
  const verticalPadding = (rowHeight - barHeight) / 2;

  // Get task index in the displayed list (memoized)
  const taskIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tasksWithDates.forEach((task, index) => {
      map.set(task.id, index);
    });
    return map;
  }, [tasksWithDates]);

  const dependencyArrows = useMemo(() => dependencies
    .filter(dep => {
      // Only show dependencies where both tasks are visible
      const predIndex = taskIndexMap.get(dep.predecessorId);
      const succIndex = taskIndexMap.get(dep.successorId);
      return predIndex !== undefined && succIndex !== undefined;
    })
    .map(dep => {
      const predTask = tasksWithDates.find(t => t.id === dep.predecessorId);
      const succTask = tasksWithDates.find(t => t.id === dep.successorId);

      if (!predTask || !succTask) {return null;}

      const predPos = getTaskPosition(predTask);
      const succPos = getTaskPosition(succTask);

      if (!predPos || !succPos) {return null;}

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
    }>
  , [dependencies, tasksWithDates, taskIndexMap, getTaskPosition, rowHeight, verticalPadding, currentProjectId]);

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

        <div className="flex items-center gap-3">
          <FilterPopover
            fields={[{ id: 'title', label: t('task.title') }]}
            value={filterState}
            onChange={setFilterState}
            storageKey="taskscheduller-filters-gantt"
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={highlightToday}
              onCheckedChange={handleHighlightTodayChange}
            />
            <span>{t('gantt.highlightToday')}</span>
          </label>

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
      </div>

      {/* Gantt Chart */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {tasksWithDates.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-base">
              {t('message.noTasksWithDates')}
            </p>
          </div>
        ) : (
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="flex border-b border-border sticky top-0 bg-background z-20">
            <div
              className="shrink-0 border-r border-border sticky left-0 bg-background z-10 select-none"
              style={{ width: taskColumnWidth }}
            >
              <div className="p-2 text-sm font-medium flex items-center">
                {t('task.task')}
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20"
                  onMouseDown={handleColumnResizeStart}
                />
              </div>
            </div>
            <div className="flex-1 flex">
              {columns.map((col, idx) => {
                const isWeekend = viewMode === 'day' &&
                  (col.startDate.getDay() === 0 || col.startDate.getDay() === 6);
                const shouldHighlight = highlightToday && col.isCurrentPeriod;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'text-center text-xs border-r border-border py-1',
                      shouldHighlight && 'bg-red-500/10',
                      !shouldHighlight && isWeekend && 'bg-muted/50'
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
              className="absolute top-0 pointer-events-none z-10"
              style={{
                left: taskColumnWidth,
                width: totalChartWidth,
                height: tasksWithDates.length * rowHeight,
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
            {tasksWithDates.map((task, index) => {
              const position = getTaskPosition(task);
              const isDragging = dragState?.taskId === task.id;
              const isRowDragging = rowDragState?.taskId === task.id;
              const isDropTarget = rowDragState && rowDragState.currentIndex === index && rowDragState.taskId !== task.id;
              const isConnectionSource = connectionState?.predecessorId === task.id;
              const isConnectionTarget = connectionState && connectionState.predecessorId !== task.id;

              return (
                <div
                  key={task.id}
                  draggable={!connectionState}
                  onDragStart={(e) => handleRowDragStart(e, task.id, index)}
                  onDragOver={(e) => handleRowDragOver(e, index)}
                  onDragEnd={handleRowDragEnd}
                  className={cn(
                    'flex border-b border-border hover:bg-muted/30',
                    isConnectionTarget && 'cursor-pointer hover:bg-primary/20',
                    isRowDragging && 'opacity-50 bg-muted/50',
                    isDropTarget && 'border-t-2 border-t-primary'
                  )}
                  style={{ height: rowHeight }}
                  onClick={() => {
                    if (isConnectionTarget) {
                      handleCompleteConnection(task.id);
                    }
                  }}
                >
                  <div className="shrink-0 p-3 border-r border-border flex items-center gap-2 sticky left-0 bg-background z-[5]" style={{ width: taskColumnWidth, height: rowHeight }}>
                    {/* Drag handle */}
                    <div className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <TruncatedTaskInfo task={task} className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                        onDoubleClick={(e) => {
                          if (!connectionState) {
                            e.stopPropagation();
                            handleEditTask(task);
                          }
                        }}
                      >
                        {/* Title */}
                        <div className="text-sm font-medium truncate">{task.title}</div>
                        {/* Project indicator in All Tasks mode */}
                        {currentProjectId === null && task.projectId && (() => {
                          const projectInfo = projects.find(p => p.id === task.projectId);
                          if (!projectInfo) {return null;}
                          return (
                            <div className="flex items-center gap-0.5 text-xs truncate">
                              <FolderOpen className="h-3 w-3 shrink-0" style={{ color: projectInfo.color }} />
                              <span
                                className="px-1 py-0 rounded truncate"
                                style={{ backgroundColor: projectInfo.color + '20', color: projectInfo.color }}
                              >
                                {projectInfo.name}
                              </span>
                            </div>
                          );
                        })()}
                        {/* Date range */}
                        <div className="text-xs text-muted-foreground truncate">
                          {task.startDate && new Date(task.startDate).toLocaleDateString()}
                          {task.startDate && task.dueDate && ' - '}
                          {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </TruncatedTaskInfo>
                    {/* Connect button - always visible */}
                    {!connectionState && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-7 w-7"
                        title={t('gantt.addDependency')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartConnection(task);
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
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
                  <div className="flex-1 relative" style={{ height: rowHeight }}>
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {columns.map((col, index) => {
                        const isWeekend = viewMode === 'day' &&
                          (col.startDate.getDay() === 0 || col.startDate.getDay() === 6);
                        const shouldHighlight = highlightToday && col.isCurrentPeriod;

                        return (
                          <div
                            key={index}
                            className={cn(
                              'border-r border-border',
                              shouldHighlight && 'bg-red-500/10',
                              !shouldHighlight && isWeekend && 'bg-muted/30'
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

                      // Get color from kanban column settings (convert to hex for inline styles)
                      const columnColorClass = getColumnColor(task.status);
                      const hexColor = getHexColor(columnColorClass);

                      return (
                        <div
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 h-7 rounded group overflow-hidden z-[5]',
                            isDragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab hover:brightness-110',
                            isConnectionSource && 'ring-2 ring-primary ring-offset-1',
                            isConnectionTarget && 'hover:ring-2 hover:ring-primary'
                          )}
                          style={{
                            left: `${finalLeft}px`,
                            width: `${finalWidth}px`,
                            backgroundColor: `${hexColor}30`, // 30 is hex for ~19% opacity
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
                            className="h-full rounded-l pointer-events-none"
                            style={{ width: `${task.progress}%`, backgroundColor: hexColor }}
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
        )}
      </div>

      {/* Connection mode banner */}
      {connectionState && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-30">
          <span className="text-sm">
            {t('gantt.selectSuccessor').replace('{task}', connectionState.predecessorTaskTitle)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-primary-foreground/20 text-primary-foreground"
            onClick={handleCancelConnection}
          >
            <X className="h-4 w-4" />
          </Button>
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
