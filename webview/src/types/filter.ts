/**
 * Filter condition for a single field
 */
export interface FilterCondition {
  id: string; // Unique ID for React keys
  field: string; // Field name (e.g., 'title', 'description', 'status')
  value: string; // Search value
}

/**
 * Filter state containing multiple conditions
 */
export interface FilterState {
  logic: 'AND' | 'OR'; // How to combine multiple conditions
  conditions: FilterCondition[];
  enabled: boolean; // Quick toggle for all filters
}

/**
 * Create an empty filter state
 */
export function createEmptyFilterState(): FilterState {
  return {
    logic: 'AND',
    conditions: [],
    enabled: true,
  };
}

/**
 * Evaluate a single filter condition against an item
 */
export function evaluateCondition(item: unknown, condition: FilterCondition): boolean {
  // Type guard to ensure item is an object
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const fieldValue = (item as Record<string, unknown>)[condition.field];

  // Handle null/undefined field values
  if (fieldValue === null || fieldValue === undefined) {
    return condition.value === '';
  }

  // Convert to string for comparison
  const valueStr = String(fieldValue).toLowerCase();
  const searchStr = condition.value.toLowerCase();

  // Simple "contains" operator
  return valueStr.includes(searchStr);
}

/**
 * Evaluate the entire filter state against an item
 */
export function evaluateFilter(item: unknown, filter: FilterState): boolean {
  // If filter is disabled or has no conditions, include the item
  if (!filter.enabled || filter.conditions.length === 0) {
    return true;
  }

  // Evaluate based on logic (AND/OR)
  if (filter.logic === 'AND') {
    // All conditions must match
    return filter.conditions.every(condition => evaluateCondition(item, condition));
  } else {
    // At least one condition must match
    return filter.conditions.some(condition => evaluateCondition(item, condition));
  }
}

/**
 * Save filter state to localStorage
 */
export function saveFilterState(key: string, state: FilterState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save filter state:', error);
  }
}

/**
 * Load filter state from localStorage
 */
export function loadFilterState(key: string): FilterState | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load filter state:', error);
  }
  return null;
}
