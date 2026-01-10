import type { Database } from 'sql.js';

export const migration001Initial = {
  version: 1,
  name: '001_initial',
  up(db: Database): void {
    // Tasks table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo'
          CHECK(status IN ('todo', 'in_progress', 'done')),
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
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // Task indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)');

    // Labels table
    db.run(`
      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#6b7280',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Task-Label junction table (many-to-many)
    db.run(`
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        PRIMARY KEY (task_id, label_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_task_labels_label ON task_labels(label_id)');

    // Dependencies table (for Gantt chart)
    db.run(`
      CREATE TABLE IF NOT EXISTS dependencies (
        id TEXT PRIMARY KEY,
        predecessor_id TEXT NOT NULL,
        successor_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL DEFAULT 'finish_to_start'
          CHECK(dependency_type IN (
            'finish_to_start',
            'start_to_start',
            'finish_to_finish',
            'start_to_finish'
          )),
        lag_days INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(predecessor_id, successor_id),
        FOREIGN KEY (predecessor_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (successor_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    db.run(
      'CREATE INDEX IF NOT EXISTS idx_dependencies_predecessor ON dependencies(predecessor_id)'
    );
    db.run('CREATE INDEX IF NOT EXISTS idx_dependencies_successor ON dependencies(successor_id)');

    // Settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Trigger for auto-updating updated_at
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
