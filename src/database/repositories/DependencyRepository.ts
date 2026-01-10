import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../DatabaseManager';
import type { Dependency, DependencyType, CreateDependencyDto } from '../../models/types';

interface DependencyRow {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
}

function rowToDependency(row: DependencyRow): Dependency {
  return {
    id: row.id,
    predecessorId: row.predecessor_id,
    successorId: row.successor_id,
    dependencyType: row.dependency_type,
    lagDays: row.lag_days,
    createdAt: row.created_at,
  };
}

export class DependencyRepository {
  constructor(private db: DatabaseManager) {}

  findAll(): Dependency[] {
    const rows = this.db.query<DependencyRow>('SELECT * FROM dependencies ORDER BY created_at ASC');
    return rows.map(rowToDependency);
  }

  findById(id: string): Dependency | null {
    const row = this.db.queryOne<DependencyRow>('SELECT * FROM dependencies WHERE id = ?', [id]);
    return row ? rowToDependency(row) : null;
  }

  findByPredecessor(predecessorId: string): Dependency[] {
    const rows = this.db.query<DependencyRow>(
      'SELECT * FROM dependencies WHERE predecessor_id = ?',
      [predecessorId]
    );
    return rows.map(rowToDependency);
  }

  findBySuccessor(successorId: string): Dependency[] {
    const rows = this.db.query<DependencyRow>('SELECT * FROM dependencies WHERE successor_id = ?', [
      successorId,
    ]);
    return rows.map(rowToDependency);
  }

  findByTask(taskId: string): Dependency[] {
    const rows = this.db.query<DependencyRow>(
      'SELECT * FROM dependencies WHERE predecessor_id = ? OR successor_id = ?',
      [taskId, taskId]
    );
    return rows.map(rowToDependency);
  }

  create(dto: CreateDependencyDto): Dependency {
    // Check for circular dependency
    if (this.wouldCreateCycle(dto.predecessorId, dto.successorId)) {
      throw new Error('Cannot create dependency: would create a circular dependency');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO dependencies (id, predecessor_id, successor_id, dependency_type, lag_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.predecessorId,
        dto.successorId,
        dto.dependencyType ?? 'finish_to_start',
        dto.lagDays ?? 0,
        now,
      ]
    );

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) {
      return false;
    }
    this.db.execute('DELETE FROM dependencies WHERE id = ?', [id]);
    return true;
  }

  deleteByTask(taskId: string): void {
    this.db.execute('DELETE FROM dependencies WHERE predecessor_id = ? OR successor_id = ?', [
      taskId,
      taskId,
    ]);
  }

  // Check if adding a dependency would create a cycle
  private wouldCreateCycle(predecessorId: string, successorId: string): boolean {
    // If predecessor and successor are the same, it's a cycle
    if (predecessorId === successorId) {
      return true;
    }

    // BFS to check if there's already a path from successor to predecessor
    const visited = new Set<string>();
    const queue = [successorId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === predecessorId) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Get all successors of current task
      const deps = this.findByPredecessor(current);
      for (const dep of deps) {
        if (!visited.has(dep.successorId)) {
          queue.push(dep.successorId);
        }
      }
    }

    return false;
  }
}
