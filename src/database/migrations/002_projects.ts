import type { Database } from 'sql.js';

export const migration002Projects = {
  version: 2,
  name: '002_projects',
  up(db: Database): void {
    // Projects table
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#3b82f6',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order)');

    // Add project_id column to tasks table
    db.run(`ALTER TABLE tasks ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE CASCADE`);
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');

    // Trigger for auto-updating updated_at on projects
    db.run(`
      CREATE TRIGGER IF NOT EXISTS projects_updated_at
      AFTER UPDATE ON projects
      FOR EACH ROW
      BEGIN
        UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
      END
    `);

    // Create a default project
    const defaultProjectId = 'default-project';
    db.run(
      `INSERT OR IGNORE INTO projects (id, name, description, color) VALUES (?, ?, ?, ?)`,
      [defaultProjectId, 'Default Project', 'Default project for existing tasks', '#3b82f6']
    );

    // Assign existing tasks to the default project
    db.run(`UPDATE tasks SET project_id = ? WHERE project_id IS NULL`, [defaultProjectId]);
  },
};
