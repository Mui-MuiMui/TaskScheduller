import type { Database } from 'sql.js';
import { migration001Initial } from './001_initial';
import { migration002Projects } from './002_projects';
import { migration003AddOnHoldStatus } from './003_add_on_hold_status';
import { migration004KanbanColumns } from './004_kanban_columns';
import { migration005KanbanColumnsProject } from './005_kanban_columns_project';
import { migration006ProjectColumnOrder } from './006_project_column_order';

export interface Migration {
  version: number;
  name: string;
  up(db: Database): void;
}

export const migrations: Migration[] = [
  migration001Initial,
  migration002Projects,
  migration003AddOnHoldStatus,
  migration004KanbanColumns,
  migration005KanbanColumnsProject,
  migration006ProjectColumnOrder,
];
