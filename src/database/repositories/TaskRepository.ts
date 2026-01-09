import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../DatabaseManager';
import type {
  Task,
  TaskStatus,
  Priority,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilter,
} from '../../models/types';

// Database row type (snake_case)
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  start_date: string | null;
  assignee: string | null;
  estimated_hours: number | null;
  progress: number;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Convert database row to Task entity
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    startDate: row.start_date,
    assignee: row.assignee,
    estimatedHours: row.estimated_hours,
    progress: row.progress,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TaskRepository {
  constructor(private db: DatabaseManager) {}

  findAll(filter?: TaskFilter): Task[] {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: unknown[] = [];

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        sql += ` AND status IN (${filter.status.map(() => '?').join(',')})`;
        params.push(...filter.status);
      }

      if (filter.priority && filter.priority.length > 0) {
        sql += ` AND priority IN (${filter.priority.map(() => '?').join(',')})`;
        params.push(...filter.priority);
      }

      if (filter.assignee) {
        sql += ' AND assignee = ?';
        params.push(filter.assignee);
      }

      if (filter.dueDateFrom) {
        sql += ' AND due_date >= ?';
        params.push(filter.dueDateFrom);
      }

      if (filter.dueDateTo) {
        sql += ' AND due_date <= ?';
        params.push(filter.dueDateTo);
      }

      if (filter.searchText) {
        sql += ' AND (title LIKE ? OR description LIKE ?)';
        const searchPattern = `%${filter.searchText}%`;
        params.push(searchPattern, searchPattern);
      }
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC';

    const rows = this.db.query<TaskRow>(sql, params);
    return rows.map(rowToTask);
  }

  findById(id: string): Task | null {
    const row = this.db.queryOne<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
    return row ? rowToTask(row) : null;
  }

  findByStatus(status: TaskStatus): Task[] {
    const rows = this.db.query<TaskRow>(
      'SELECT * FROM tasks WHERE status = ? ORDER BY sort_order ASC, created_at DESC',
      [status]
    );
    return rows.map(rowToTask);
  }

  findByParentId(parentId: string | null): Task[] {
    const sql = parentId
      ? 'SELECT * FROM tasks WHERE parent_id = ? ORDER BY sort_order ASC'
      : 'SELECT * FROM tasks WHERE parent_id IS NULL ORDER BY sort_order ASC';
    const params = parentId ? [parentId] : [];
    const rows = this.db.query<TaskRow>(sql, params);
    return rows.map(rowToTask);
  }

  create(dto: CreateTaskDto): Task {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get max sort_order for the status
    const maxOrderResult = this.db.queryOne<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE status = ?',
      [dto.status ?? 'todo']
    );
    const sortOrder = (maxOrderResult?.max_order ?? -1) + 1;

    this.db.execute(
      `INSERT INTO tasks (
        id, title, description, status, priority,
        due_date, start_date, assignee, estimated_hours,
        progress, parent_id, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.title,
        dto.description ?? null,
        dto.status ?? 'todo',
        dto.priority ?? 2,
        dto.dueDate ?? null,
        dto.startDate ?? null,
        dto.assignee ?? null,
        dto.estimatedHours ?? null,
        0, // progress
        dto.parentId ?? null,
        sortOrder,
        now,
        now,
      ]
    );

    // Add labels if provided
    if (dto.labelIds && dto.labelIds.length > 0) {
      for (const labelId of dto.labelIds) {
        this.db.execute('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
      }
    }

    return this.findById(id)!;
  }

  update(id: string, dto: UpdateTaskDto): Task | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (dto.title !== undefined) {
      updates.push('title = ?');
      params.push(dto.title);
    }
    if (dto.description !== undefined) {
      updates.push('description = ?');
      params.push(dto.description);
    }
    if (dto.status !== undefined) {
      updates.push('status = ?');
      params.push(dto.status);
    }
    if (dto.priority !== undefined) {
      updates.push('priority = ?');
      params.push(dto.priority);
    }
    if (dto.dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dto.dueDate);
    }
    if (dto.startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(dto.startDate);
    }
    if (dto.assignee !== undefined) {
      updates.push('assignee = ?');
      params.push(dto.assignee);
    }
    if (dto.estimatedHours !== undefined) {
      updates.push('estimated_hours = ?');
      params.push(dto.estimatedHours);
    }
    if (dto.progress !== undefined) {
      updates.push('progress = ?');
      params.push(dto.progress);
    }
    if (dto.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(dto.sortOrder);
    }
    if (dto.parentId !== undefined) {
      updates.push('parent_id = ?');
      params.push(dto.parentId);
    }

    if (updates.length > 0) {
      params.push(id);
      this.db.execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update labels if provided
    if (dto.labelIds !== undefined) {
      this.db.execute('DELETE FROM task_labels WHERE task_id = ?', [id]);
      for (const labelId of dto.labelIds) {
        this.db.execute('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
      }
    }

    return this.findById(id);
  }

  updateStatus(id: string, status: TaskStatus): Task | null {
    return this.update(id, { status });
  }

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) {
      return false;
    }
    this.db.execute('DELETE FROM tasks WHERE id = ?', [id]);
    return true;
  }

  reorder(taskIds: string[], status?: TaskStatus): void {
    this.db.transaction(() => {
      taskIds.forEach((taskId, index) => {
        const updates = ['sort_order = ?'];
        const params: unknown[] = [index];

        if (status) {
          updates.push('status = ?');
          params.push(status);
        }

        params.push(taskId);
        this.db.execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
      });
    });
  }

  getLabelsForTask(taskId: string): string[] {
    const rows = this.db.query<{ label_id: string }>(
      'SELECT label_id FROM task_labels WHERE task_id = ?',
      [taskId]
    );
    return rows.map((r) => r.label_id);
  }
}
