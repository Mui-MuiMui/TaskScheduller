import { useState, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useI18n } from '@/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { KanbanColumn } from '@/types';
import { COLUMN_PRESET_COLORS, getHexColor } from '@/types';
import { cn } from '@/lib/utils';

interface ColumnFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: KanbanColumn;
}

export function ColumnFormDialog({ open, onOpenChange, column }: ColumnFormDialogProps) {
  const { t } = useI18n();
  const {
    kanbanColumns,
    createKanbanColumn,
    updateKanbanColumn,
    deleteKanbanColumn,
    tasks,
    projects,
    currentProjectId,
  } = useTaskStore();

  const [name, setName] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string>('');

  const isEditing = !!column;
  const taskCount = column ? tasks.filter((t) => t.status === column.id).length : 0;
  const otherColumns = kanbanColumns.filter((c) => c.id !== column?.id);
  // Essential columns (todo and done) cannot be deleted
  const isEssentialColumn = column?.id === 'todo' || column?.id === 'done';
  // Get current project name for display
  const currentProject = projects.find(p => p.id === currentProjectId);

  useEffect(() => {
    if (column) {
      setName(column.name);
      setColor(column.color);
      setScope(column.projectId ? 'project' : 'global');
    } else {
      setName('');
      setColor('bg-blue-500');
      setScope('global');
    }
    setShowDeleteConfirm(false);
    setTargetColumnId('');
  }, [column, open]);

  const handleSubmit = () => {
    if (!name.trim()) {return;}

    if (isEditing && column) {
      updateKanbanColumn(column.id, { name: name.trim(), color });
    } else {
      // For new columns, pass projectId based on scope
      const projectId = scope === 'project' ? currentProjectId : null;
      createKanbanColumn(name.trim(), color, projectId);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!column) {return;}

    if (taskCount > 0 && !showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    if (taskCount === 0) {
      deleteKanbanColumn(column.id);
      onOpenChange(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!column || !targetColumnId) {return;}
    deleteKanbanColumn(column.id, targetColumnId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('kanban.editColumn') : t('kanban.addColumn')}
          </DialogTitle>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('kanban.columnName')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('kanban.columnNamePlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t('kanban.columnColor')}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLUMN_PRESET_COLORS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all p-0',
                        color === preset.class
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: getHexColor(preset.class) }}
                      onClick={() => setColor(preset.class)}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              {/* Scope selection - only for new columns when in a project context */}
              {!isEditing && currentProjectId && (
                <div className="grid gap-2">
                  <Label>{t('kanban.columnScope')}</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as 'global' | 'project')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">
                        <span>{t('kanban.scopeGlobal')}</span>
                      </SelectItem>
                      <SelectItem value="project">
                        <span>{t('kanban.scopeProject', currentProject?.name || '')}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {scope === 'global' ? t('kanban.scopeGlobalDesc') : t('kanban.scopeProjectDesc')}
                  </p>
                </div>
              )}

              {/* Show scope info for existing columns */}
              {isEditing && column && (
                <div className="grid gap-1">
                  <Label className="text-muted-foreground">{t('kanban.columnScope')}</Label>
                  <p className="text-sm">
                    {column.projectId
                      ? t('kanban.scopeProjectInfo', projects.find(p => p.id === column.projectId)?.name || '')
                      : t('kanban.scopeGlobalInfo')
                    }
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <div>
                {isEditing && !isEssentialColumn && (
                  <Button type="button" variant="destructive" onClick={handleDelete}>
                    {t('action.delete')}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('action.cancel')}
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={!name.trim()}>
                  {isEditing ? t('action.save') : t('action.create')}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                {t('kanban.deleteColumnWithTasks').replace('{0}', String(taskCount))}
              </p>
              <div className="grid gap-2">
                <Label>{t('kanban.moveTasksTo')}</Label>
                <Select value={targetColumnId} onValueChange={setTargetColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('kanban.selectTargetColumn')} />
                  </SelectTrigger>
                  <SelectContent>
                    {otherColumns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getHexColor(col.color) }} />
                          {col.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('action.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!targetColumnId}
              >
                {t('kanban.moveAndDelete')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
