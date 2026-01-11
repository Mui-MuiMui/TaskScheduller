import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../DatabaseManager';
import type { KanbanColumn, CreateKanbanColumnDto, UpdateKanbanColumnDto } from '../../models/types';

// Database row type (snake_case)
interface KanbanColumnRow {
  id: string;
  project_id: string | null;
  name: string;
  color: string;
  sort_order: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

// Row with project-specific sort order
interface KanbanColumnWithOrderRow extends KanbanColumnRow {
  effective_sort_order: number;
}

// Project column order row
interface ProjectColumnOrderRow {
  id: string;
  project_id: string | null;
  column_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Convert database row to KanbanColumn entity
function rowToKanbanColumn(row: KanbanColumnRow): KanbanColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert row with effective sort order
function rowWithOrderToKanbanColumn(row: KanbanColumnWithOrderRow): KanbanColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    sortOrder: row.effective_sort_order, // Use project-specific order
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class KanbanColumnRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Find all columns (global + project-specific if projectId provided)
   * Uses project-specific ordering from project_column_order table
   * @param projectId - If provided, returns global columns + columns for this project with project-specific order
   *                    If null/undefined, returns all global columns (for "All Tasks" view)
   */
  findAll(projectId?: string | null): KanbanColumn[] {
    if (projectId) {
      // Return global columns (project_id IS NULL) + project-specific columns
      // Use project-specific ordering if available, otherwise fall back to default sort_order
      const rows = this.db.query<KanbanColumnWithOrderRow>(
        `SELECT kc.*,
                COALESCE(pco.sort_order, kc.sort_order) as effective_sort_order
         FROM kanban_columns kc
         LEFT JOIN project_column_order pco
           ON pco.column_id = kc.id AND pco.project_id = ?
         WHERE kc.project_id IS NULL OR kc.project_id = ?
         ORDER BY effective_sort_order ASC`,
        [projectId, projectId]
      );
      return rows.map(rowWithOrderToKanbanColumn);
    } else {
      // "All Tasks" view - return ALL columns (global + all project-specific)
      // Use "All Tasks" specific ordering from project_column_order (where project_id IS NULL)
      const rows = this.db.query<KanbanColumnWithOrderRow>(
        `SELECT kc.*,
                COALESCE(pco.sort_order,
                  CASE WHEN kc.project_id IS NULL THEN kc.sort_order ELSE kc.sort_order + 1000 END
                ) as effective_sort_order
         FROM kanban_columns kc
         LEFT JOIN project_column_order pco
           ON pco.column_id = kc.id AND pco.project_id IS NULL
         ORDER BY effective_sort_order ASC`
      );
      return rows.map(rowWithOrderToKanbanColumn);
    }
  }

  /**
   * Find all columns regardless of project (for export)
   */
  findAllForExport(): KanbanColumn[] {
    const rows = this.db.query<KanbanColumnRow>(
      'SELECT * FROM kanban_columns ORDER BY project_id NULLS FIRST, sort_order ASC'
    );
    return rows.map(rowToKanbanColumn);
  }

  findById(id: string, projectId?: string | null): KanbanColumn | null {
    if (projectId !== undefined) {
      // Get with project-specific order
      const row = this.db.queryOne<KanbanColumnWithOrderRow>(
        `SELECT kc.*,
                COALESCE(pco.sort_order, kc.sort_order) as effective_sort_order
         FROM kanban_columns kc
         LEFT JOIN project_column_order pco
           ON pco.column_id = kc.id AND (pco.project_id = ? OR (pco.project_id IS NULL AND ? IS NULL))
         WHERE kc.id = ?`,
        [projectId, projectId, id]
      );
      return row ? rowWithOrderToKanbanColumn(row) : null;
    }
    // Default: return with default sort_order
    const row = this.db.queryOne<KanbanColumnRow>(
      'SELECT * FROM kanban_columns WHERE id = ?',
      [id]
    );
    return row ? rowToKanbanColumn(row) : null;
  }

  create(dto: CreateKanbanColumnDto, forProjectId?: string | null): KanbanColumn {
    const id = uuidv4();
    const now = new Date().toISOString();
    const columnProjectId = dto.projectId === undefined ? null : dto.projectId;

    // Get default sort_order for the column itself (used when no project-specific order exists)
    const maxOrderResult = this.db.queryOne<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM kanban_columns'
    );
    const defaultSortOrder = (maxOrderResult?.max_order ?? -1) + 1;

    this.db.execute(
      `INSERT INTO kanban_columns (id, project_id, name, color, sort_order, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, columnProjectId, dto.name, dto.color, defaultSortOrder, now, now]
    );

    // Determine which project context to add the column order for
    // If column is project-specific, use that project
    // If column is global and forProjectId is provided, use forProjectId
    const orderProjectId = columnProjectId ?? forProjectId;

    // Add project-specific order entry so the new column appears at the end
    this.addColumnToProjectOrder(id, orderProjectId);

    // Return the column with the correct sort order for the context
    return this.findById(id, orderProjectId)!;
  }

  /**
   * Add a column to a project's ordering at the end
   */
  private addColumnToProjectOrder(columnId: string, projectId?: string | null): void {
    const now = new Date().toISOString();

    // Get max order for this project's view
    let maxOrderResult;
    if (projectId) {
      // For a specific project, get max from project_column_order for this project
      // or fall back to kanban_columns default order for columns not yet in the order table
      maxOrderResult = this.db.queryOne<{ max_order: number | null }>(
        `SELECT MAX(COALESCE(pco.sort_order, kc.sort_order)) as max_order
         FROM kanban_columns kc
         LEFT JOIN project_column_order pco
           ON pco.column_id = kc.id AND pco.project_id = ?
         WHERE kc.project_id IS NULL OR kc.project_id = ?`,
        [projectId, projectId]
      );
    } else {
      // For "All Tasks" view
      maxOrderResult = this.db.queryOne<{ max_order: number | null }>(
        `SELECT MAX(COALESCE(pco.sort_order, kc.sort_order)) as max_order
         FROM kanban_columns kc
         LEFT JOIN project_column_order pco
           ON pco.column_id = kc.id AND pco.project_id IS NULL
         WHERE kc.project_id IS NULL`
      );
    }
    const newSortOrder = (maxOrderResult?.max_order ?? -1) + 1;

    // Insert the order entry
    const orderId = uuidv4();
    this.db.execute(
      `INSERT OR REPLACE INTO project_column_order (id, project_id, column_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, projectId ?? null, columnId, newSortOrder, now, now]
    );
  }

  update(id: string, dto: UpdateKanbanColumnDto): KanbanColumn | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      params.push(dto.name);
    }
    if (dto.color !== undefined) {
      updates.push('color = ?');
      params.push(dto.color);
    }
    if (dto.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(dto.sortOrder);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);
    this.db.execute(`UPDATE kanban_columns SET ${updates.join(', ')} WHERE id = ?`, params);

    return this.findById(id);
  }

  delete(id: string): { success: boolean; error?: string } {
    // Prevent deletion of essential columns (todo and done)
    if (id === 'todo' || id === 'done') {
      return {
        success: false,
        error: 'Cannot delete essential columns (To Do and Done).',
      };
    }

    const existing = this.findById(id);
    if (!existing) {
      return { success: false, error: 'Column not found' };
    }

    // Check for tasks in this column
    const taskCount = this.getTaskCountByColumn(id);
    if (taskCount > 0) {
      return {
        success: false,
        error: `Cannot delete column with ${taskCount} tasks. Move or delete tasks first.`,
      };
    }

    this.db.execute('DELETE FROM kanban_columns WHERE id = ?', [id]);
    return { success: true };
  }

  deleteWithMigration(id: string, targetColumnId: string): { success: boolean; error?: string } {
    // Prevent deletion of essential columns (todo and done)
    if (id === 'todo' || id === 'done') {
      return {
        success: false,
        error: 'Cannot delete essential columns (To Do and Done).',
      };
    }

    const existing = this.findById(id);
    if (!existing) {
      return { success: false, error: 'Column not found' };
    }

    const targetColumn = this.findById(targetColumnId);
    if (!targetColumn) {
      return { success: false, error: 'Target column not found' };
    }

    this.db.transaction(() => {
      // Move tasks to target column
      this.db.execute('UPDATE tasks SET status = ? WHERE status = ?', [targetColumnId, id]);

      // Delete the column
      this.db.execute('DELETE FROM kanban_columns WHERE id = ?', [id]);
    });

    return { success: true };
  }

  /**
   * Reorder columns for a specific project context
   * @param columnIds - Array of column IDs in the desired order
   * @param projectId - Project ID (null for "All Tasks" view)
   */
  reorder(columnIds: string[], projectId?: string | null): void {
    const now = new Date().toISOString();

    this.db.transaction(() => {
      columnIds.forEach((columnId, index) => {
        // Check if order entry exists
        const existing = this.db.queryOne<ProjectColumnOrderRow>(
          `SELECT * FROM project_column_order
           WHERE column_id = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))`,
          [columnId, projectId ?? null, projectId ?? null]
        );

        if (existing) {
          // Update existing order
          this.db.execute(
            `UPDATE project_column_order
             SET sort_order = ?, updated_at = ?
             WHERE id = ?`,
            [index, now, existing.id]
          );
        } else {
          // Insert new order entry
          const orderId = uuidv4();
          this.db.execute(
            `INSERT INTO project_column_order (id, project_id, column_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [orderId, projectId ?? null, columnId, index, now, now]
          );
        }
      });
    });
  }

  getTaskCountByColumn(columnId: string): number {
    const result = this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks WHERE status = ?',
      [columnId]
    );
    return result?.count ?? 0;
  }
}
