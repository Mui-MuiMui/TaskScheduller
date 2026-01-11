import type { Database } from 'sql.js';

/**
 * Migration 006: Add project_column_order table
 *
 * This table stores the column ordering per project.
 * Each project can have its own independent ordering of columns.
 * - For projects without explicit ordering, columns fall back to their default sort_order
 * - Global columns (project_id IS NULL) and project-specific columns are ordered together per project
 */
export const migration006ProjectColumnOrder = {
  version: 6,
  name: '006_project_column_order',

  up(db: Database): void {
    // Create project_column_order table
    // project_id NULL means "All Tasks" view (no project filter)
    db.run(`
      CREATE TABLE IF NOT EXISTS project_column_order (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        column_id TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, column_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for efficient lookup
    db.run(
      'CREATE INDEX IF NOT EXISTS idx_project_column_order_project ON project_column_order(project_id)'
    );
    db.run(
      'CREATE INDEX IF NOT EXISTS idx_project_column_order_column ON project_column_order(column_id)'
    );
  },
};
