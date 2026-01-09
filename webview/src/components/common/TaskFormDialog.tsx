import { useState, useEffect, useMemo } from 'react';
import type { Task, CreateTaskDto, TaskStatus, Priority } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { PRIORITY_LABEL_KEYS } from '@/types';
import { X, Plus } from 'lucide-react';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task; // If provided, edit mode; otherwise create mode
}

export function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
  const { t } = useI18n();
  const { tasks, dependencies, createTask, updateTaskApi, createDependency, deleteDependency } = useTaskStore();
  const isEditMode = !!task;

  const [formData, setFormData] = useState<CreateTaskDto>({
    title: '',
    description: '',
    status: 'todo',
    priority: 2,
    dueDate: '',
    startDate: '',
    assignee: '',
    estimatedHours: undefined,
    progress: 0,
  });

  // 新規作成時の先行タスク選択用
  const [selectedPredecessorIds, setSelectedPredecessorIds] = useState<string[]>([]);

  // 現在のタスクの先行タスク（依存関係）を取得
  const currentDependencies = useMemo(() => {
    if (!task) return [];
    return dependencies
      .filter(d => d.successorId === task.id)
      .map(d => ({
        dependency: d,
        predecessorTask: tasks.find(t => t.id === d.predecessorId),
      }))
      .filter(d => d.predecessorTask);
  }, [task, dependencies, tasks]);

  // 選択可能な先行タスク（自分自身と既に依存関係にあるタスクを除外）
  const availablePredecessors = useMemo(() => {
    if (isEditMode && task) {
      // 編集モード: 既存の依存関係にあるタスクを除外
      const existingPredecessorIds = new Set(currentDependencies.map(d => d.dependency.predecessorId));
      return tasks.filter(t =>
        t.id !== task.id &&
        !existingPredecessorIds.has(t.id)
      );
    } else {
      // 新規作成モード: 選択済みのタスクを除外
      const selectedIds = new Set(selectedPredecessorIds);
      return tasks.filter(t => !selectedIds.has(t.id));
    }
  }, [isEditMode, task, tasks, currentDependencies, selectedPredecessorIds]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || '',
        startDate: task.startDate || '',
        assignee: task.assignee || '',
        estimatedHours: task.estimatedHours || undefined,
        progress: task.progress || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 2,
        dueDate: '',
        startDate: '',
        assignee: '',
        estimatedHours: undefined,
        progress: 0,
      });
      setSelectedPredecessorIds([]);
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    // 日付の整合性チェック：期限日が開始日より前の場合は開始日に合わせる
    let finalStartDate = formData.startDate || undefined;
    let finalDueDate = formData.dueDate || undefined;
    if (finalStartDate && finalDueDate && finalDueDate < finalStartDate) {
      finalDueDate = finalStartDate;
    }

    const cleanedData = {
      ...formData,
      description: formData.description || undefined,
      dueDate: finalDueDate,
      startDate: finalStartDate,
      assignee: formData.assignee || undefined,
      estimatedHours: formData.estimatedHours || undefined,
      progress: formData.progress ?? 0,
    };

    if (isEditMode && task) {
      updateTaskApi(task.id, cleanedData);
    } else {
      // 新規作成時は先行タスクのIDリストを含めて作成
      createTask(cleanedData, selectedPredecessorIds);
    }

    onOpenChange(false);
  };

  // 依存関係を追加（選択時に即座に追加）
  const handleAddDependency = (predecessorId: string) => {
    if (!task || !predecessorId) return;
    createDependency(predecessorId, task.id);
  };

  // 依存関係を削除
  const handleRemoveDependency = (dependencyId: string) => {
    deleteDependency(dependencyId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('action.edit') : t('action.newTask')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium">{t('task.title')} *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('task.title')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium">{t('task.description')}</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('task.description')}
              rows={3}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{t('task.status')}</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">{t('status.todo')}</SelectItem>
                  <SelectItem value="in_progress">{t('status.inProgress')}</SelectItem>
                  <SelectItem value="on_hold">{t('status.onHold')}</SelectItem>
                  <SelectItem value="done">{t('status.done')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">{t('task.priority')}</label>
              <Select
                value={String(formData.priority)}
                onValueChange={(value) => setFormData({ ...formData, priority: Number(value) as Priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([1, 2, 3, 4] as Priority[]).map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {t(PRIORITY_LABEL_KEYS[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{t('task.startDate')}</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">{t('task.dueDate')}</label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
              {/* 日付の整合性警告 */}
              {formData.startDate && formData.dueDate && formData.dueDate < formData.startDate && (
                <p className="text-xs text-amber-500">{t('validation.dueDateBeforeStartDate')}</p>
              )}
            </div>
          </div>

          {/* Assignee and Estimated Hours */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{t('task.assignee')}</label>
              <Input
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                placeholder={t('task.assignee')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">{t('task.estimatedHours')}</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours || ''}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <label className="text-xs font-medium">{t('task.progress')}</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  setFormData({ ...formData, progress: val });
                }}
                className="w-16 text-center"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-2">
            <label className="text-xs font-medium">{t('task.dependencies')}</label>

            {/* 編集モード: 現在の依存関係（先行タスク）一覧 */}
            {isEditMode && currentDependencies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentDependencies.map(({ dependency, predecessorTask }) => (
                  <Badge
                    key={dependency.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="max-w-[150px] truncate">{predecessorTask!.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDependency(dependency.id)}
                      className="ml-1 hover:bg-muted rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* 新規作成モード: 選択した先行タスク一覧 */}
            {!isEditMode && selectedPredecessorIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPredecessorIds.map(predId => {
                  const predTask = tasks.find(t => t.id === predId);
                  if (!predTask) return null;
                  return (
                    <Badge
                      key={predId}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span className="max-w-[150px] truncate">{predTask.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPredecessorIds(prev => prev.filter(id => id !== predId))}
                        className="ml-1 hover:bg-muted rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* 先行タスク追加 */}
            {availablePredecessors.length > 0 && (
              <Select
                value=""
                onValueChange={(predecessorId) => {
                  if (isEditMode) {
                    handleAddDependency(predecessorId);
                  } else {
                    setSelectedPredecessorIds(prev => [...prev, predecessorId]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('task.selectPredecessor')} />
                </SelectTrigger>
                <SelectContent>
                  {availablePredecessors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        {t.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {availablePredecessors.length === 0 && (isEditMode ? currentDependencies.length === 0 : selectedPredecessorIds.length === 0) && tasks.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('task.noDependenciesAvailable')}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" disabled={!formData.title.trim()}>
              {isEditMode ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
