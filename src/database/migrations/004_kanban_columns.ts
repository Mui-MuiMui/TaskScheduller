import type { Database } from 'sql.js';

export const migration004KanbanColumns = {
  version: 4,
  name: '004_kanban_columns',
  up(db: Database): void {
    // 1. Create kanban_columns table
    db.run(`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'bg-blue-500',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_kanban_columns_sort_order ON kanban_columns(sort_order)');

    // 2. Insert default columns
    const defaultColumns = [
      { id: 'todo', name: 'To Do', color: 'bg-blue-500', sortOrder: 0 },
      { id: 'in_progress', name: 'In Progress', color: 'bg-yellow-500', sortOrder: 1 },
      { id: 'on_hold', name: 'On Hold', color: 'bg-gray-500', sortOrder: 2 },
      { id: 'done', name: 'Done', color: 'bg-green-500', sortOrder: 3 },
    ];

    const now = new Date().toISOString();
    for (const col of defaultColumns) {
      db.run(
        `INSERT INTO kanban_columns (id, name, color, sort_order, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [col.id, col.name, col.color, col.sortOrder, now, now]
      );
    }

    // 3. Recreate tasks table without status CHECK constraint (for dynamic statuses)
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    db.run(`
      CREATE TABLE tasks_new (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
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

    // 4. Copy existing data
    db.run(`
      INSERT INTO tasks_new (id, project_id, title, description, status, priority, due_date, start_date, assignee, estimated_hours, progress, parent_id, sort_order, created_at, updated_at)
      SELECT id, project_id, title, description, status, priority, due_date, start_date, assignee, estimated_hours, progress, parent_id, sort_order, created_at, updated_at
      FROM tasks
    `);

    // 5. Drop old table
    db.run('DROP TABLE tasks');

    // 6. Rename new table
    db.run('ALTER TABLE tasks_new RENAME TO tasks');

    // 7. Recreate indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');

    // 8. Recreate trigger for tasks
    db.run(`
      CREATE TRIGGER IF NOT EXISTS tasks_updated_at
      AFTER UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
      END
    `);

    // 9. Create trigger for kanban_columns
    db.run(`
      CREATE TRIGGER IF NOT EXISTS kanban_columns_updated_at
      AFTER UPDATE ON kanban_columns
      FOR EACH ROW
      BEGIN
        UPDATE kanban_columns SET updated_at = datetime('now') WHERE id = OLD.id;
      END
    `);
  },
};
