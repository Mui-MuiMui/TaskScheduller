import type { Database } from 'sql.js';

export const migration005KanbanColumnsProject = {
  version: 5,
  name: '005_kanban_columns_project',
  up(db: Database): void {
    // Add project_id column to kanban_columns table
    // NULL = global (applies to all projects)
    // Non-NULL = project-specific column
    db.run(`
      ALTER TABLE kanban_columns ADD COLUMN project_id TEXT DEFAULT NULL
        REFERENCES projects(id) ON DELETE CASCADE
    `);

    // Create index for project filtering
    db.run('CREATE INDEX IF NOT EXISTS idx_kanban_columns_project ON kanban_columns(project_id)');
  },
};
