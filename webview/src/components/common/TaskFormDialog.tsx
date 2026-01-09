import { useState, useEffect } from 'react';
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
} from '@/components/ui';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import { PRIORITY_LABELS } from '@/types';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task; // If provided, edit mode; otherwise create mode
}

export function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
  const { t } = useI18n();
  const { createTask, updateTaskApi } = useTaskStore();
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
  });

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
      });
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const cleanedData = {
      ...formData,
      description: formData.description || undefined,
      dueDate: formData.dueDate || undefined,
      startDate: formData.startDate || undefined,
      assignee: formData.assignee || undefined,
      estimatedHours: formData.estimatedHours || undefined,
    };

    if (isEditMode && task) {
      updateTaskApi(task.id, cleanedData);
    } else {
      createTask(cleanedData);
    }

    onOpenChange(false);
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
                      {PRIORITY_LABELS[p]}
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
