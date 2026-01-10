import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../DatabaseManager';
import type { Label, CreateLabelDto } from '../../models/types';

interface LabelRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

function rowToLabel(row: LabelRow): Label {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

export class LabelRepository {
  constructor(private db: DatabaseManager) {}

  findAll(): Label[] {
    const rows = this.db.query<LabelRow>('SELECT * FROM labels ORDER BY name ASC');
    return rows.map(rowToLabel);
  }

  findById(id: string): Label | null {
    const row = this.db.queryOne<LabelRow>('SELECT * FROM labels WHERE id = ?', [id]);
    return row ? rowToLabel(row) : null;
  }

  findByName(name: string): Label | null {
    const row = this.db.queryOne<LabelRow>('SELECT * FROM labels WHERE name = ?', [name]);
    return row ? rowToLabel(row) : null;
  }

  create(dto: CreateLabelDto): Label {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.execute('INSERT INTO labels (id, name, color, created_at) VALUES (?, ?, ?, ?)', [
      id,
      dto.name,
      dto.color,
      now,
    ]);

    return this.findById(id)!;
  }

  update(id: string, dto: Partial<CreateLabelDto>): Label | null {
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

    if (updates.length > 0) {
      params.push(id);
      this.db.execute(`UPDATE labels SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) {
      return false;
    }
    this.db.execute('DELETE FROM labels WHERE id = ?', [id]);
    return true;
  }

  getTasksWithLabel(labelId: string): string[] {
    const rows = this.db.query<{ task_id: string }>(
      'SELECT task_id FROM task_labels WHERE label_id = ?',
      [labelId]
    );
    return rows.map((r) => r.task_id);
  }
}
