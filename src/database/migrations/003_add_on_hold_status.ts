import type { Database } from 'sql.js';

export const migration003AddOnHoldStatus = {
  version: 3,
  name: '003_add_on_hold_status',
  up(db: Database): void {
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    // We need to recreate the table with the new constraint

    // 1. Create new table with updated CHECK constraint
    db.run(`
      CREATE TABLE tasks_new (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo'
          CHECK(status IN ('todo', 'in_progress', 'on_hold', 'done')),
        priority INTEGER NOT NULL DEFAULT 2
          CHECK(priority BETWEEN 1 AND 4),
        due_date TEXT,
        start_date TEXT,
        assignee TEXT,
        estimated_hours REAL,
        progress INTEGER NOT NULL DEFAULT 0
          CHECK(progress BETWEEN 0 AND 100),
        parent_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES tasks_new(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `);

    // 2. Copy existing data
    db.run(`
      INSERT INTO tasks_new (id, project_id, title, description, status, priority, due_date, start_date, assignee, estimated_hours, progress, parent_id, sort_order, created_at, updated_at)
      SELECT id, project_id, title, description, status, priority, due_date, start_date, assignee, estimated_hours, progress, parent_id, sort_order, created_at, updated_at
      FROM tasks
    `);

    // 3. Drop old table
    db.run('DROP TABLE tasks');

    // 4. Rename new table
    db.run('ALTER TABLE tasks_new RENAME TO tasks');

    // 5. Recreate indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');

    // 6. Recreate trigger
    db.run(`
      CREATE TRIGGER IF NOT EXISTS tasks_updated_at
      AFTER UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
      END
    `);
  },
};
