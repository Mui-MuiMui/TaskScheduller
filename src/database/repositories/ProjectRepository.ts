import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../DatabaseManager';
import type { Project, CreateProjectDto, UpdateProjectDto } from '../../models/types';

export class ProjectRepository {
  constructor(private dbManager: DatabaseManager) {}

  private get db() {
    return this.dbManager.db;
  }

  findAll(): Project[] {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      ORDER BY p.sort_order ASC, p.created_at ASC
    `);

    const projects: Project[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      projects.push(this.mapRowToProject(row));
    }
    stmt.free();
    return projects;
  }

  findById(id: string): Project | null {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      WHERE p.id = ?
    `);
    stmt.bind([id]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.mapRowToProject(row);
    }
    stmt.free();
    return null;
  }

  create(dto: CreateProjectDto): Project {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get max sort order
    const maxOrderResult = this.db.exec('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM projects');
    const sortOrder = maxOrderResult[0]?.values[0]?.[0] as number || 0;

    this.dbManager.execute(
      `INSERT INTO projects (id, name, description, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, dto.name, dto.description || null, dto.color || '#3b82f6', sortOrder, now, now]
    );

    return this.findById(id)!;
  }

  update(id: string, dto: UpdateProjectDto): Project | null {
    const existing = this.findById(id);
    if (!existing) {return null;}

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      updates.push('description = ?');
      values.push(dto.description || null);
    }
    if (dto.color !== undefined) {
      updates.push('color = ?');
      values.push(dto.color);
    }
    if (dto.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(dto.sortOrder);
    }

    if (updates.length === 0) {return existing;}

    values.push(id);
    this.dbManager.execute(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);

    return this.findById(id);
  }

  delete(id: string): boolean {
    // Check if project exists
    const existing = this.findById(id);
    if (!existing) {return false;}

    // Don't allow deleting the default project
    if (id === 'default-project') {return false;}

    // Delete all tasks belonging to this project
    this.dbManager.execute(`DELETE FROM tasks WHERE project_id = ?`, [id]);

    // Delete project-specific kanban columns
    this.dbManager.execute(`DELETE FROM kanban_columns WHERE project_id = ?`, [id]);

    // Delete project-specific column orders
    this.dbManager.execute(`DELETE FROM project_column_order WHERE project_id = ?`, [id]);

    this.dbManager.execute('DELETE FROM projects WHERE id = ?', [id]);
    return true;
  }

  reorder(projectIds: string[]): void {
    projectIds.forEach((id, index) => {
      this.dbManager.execute('UPDATE projects SET sort_order = ? WHERE id = ?', [index, id]);
    });
  }

  private mapRowToProject(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || null,
      color: row.color as string,
      sortOrder: row.sort_order as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      taskCount: row.task_count as number,
    };
  }
}
