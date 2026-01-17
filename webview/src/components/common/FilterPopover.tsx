import { useState, useEffect } from 'react';
import { Filter, Plus, X } from 'lucide-react';
import {
  Button,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import type { FilterState, FilterCondition } from '@/types';
import { createEmptyFilterState } from '@/types';

interface FilterField {
  id: string;
  label: string;
}

interface FilterPopoverProps {
  fields: FilterField[];
  value: FilterState;
  onChange: (value: FilterState) => void;
  storageKey?: string;
}

export function FilterPopover({ fields, value, onChange, storageKey }: FilterPopoverProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  // Save to localStorage when filter changes
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to save filter state:', error);
      }
    }
  }, [value, storageKey]);

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({ ...value, logic });
  };

  const handleAddCondition = () => {
    const newCondition: FilterCondition = {
      id: `${Date.now()}-${Math.random()}`,
      field: fields[0]?.id || '',
      value: '',
    };
    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    });
  };

  const handleRemoveCondition = (id: string) => {
    onChange({
      ...value,
      conditions: value.conditions.filter(c => c.id !== id),
    });
  };

  const handleConditionChange = (id: string, updates: Partial<FilterCondition>) => {
    onChange({
      ...value,
      conditions: value.conditions.map(c => (c.id === id ? { ...c, ...updates } : c)),
    });
  };

  const handleClearAll = () => {
    onChange(createEmptyFilterState());
  };

  const activeCount = value.conditions.filter(c => c.value.trim() !== '').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={activeCount > 0 ? 'secondary' : 'ghost'}
          size="icon"
          className="relative"
        >
          <Filter className="h-4 w-4" />
          {activeCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{t('filter.title')}</h4>
          </div>

          {/* Logic toggle (only show if there are 2+ conditions) */}
          {value.conditions.length >= 2 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Match:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={value.logic === 'AND' ? 'secondary' : 'ghost'}
                  onClick={() => handleLogicChange('AND')}
                  className="h-7 px-3 text-xs"
                >
                  {t('filter.logic.and')}
                </Button>
                <Button
                  size="sm"
                  variant={value.logic === 'OR' ? 'secondary' : 'ghost'}
                  onClick={() => handleLogicChange('OR')}
                  className="h-7 px-3 text-xs"
                >
                  {t('filter.logic.or')}
                </Button>
              </div>
            </div>
          )}

          {/* Conditions list */}
          <div className="space-y-2">
            {value.conditions.map((condition) => (
                <div key={condition.id} className="flex items-center gap-2">
                  {/* Field selector */}
                  <Select
                    value={condition.field}
                    onValueChange={(field) => handleConditionChange(condition.id, { field })}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder={t('filter.field')} />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map(f => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Value input */}
                  <Input
                    type="text"
                    value={condition.value}
                    onChange={(e) => handleConditionChange(condition.id, { value: e.target.value })}
                    placeholder={t('filter.value')}
                    className="h-8 text-xs flex-1"
                  />

                  {/* Remove button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveCondition(condition.id)}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
            ))}

            {/* Empty state */}
            {value.conditions.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No filters active
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddCondition}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('filter.addCondition')}
            </Button>
            {value.conditions.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                className="h-7 px-2 text-xs"
              >
                {t('filter.clearAll')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
