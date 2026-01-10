import type { Database } from 'sql.js';
import { migration001Initial } from './001_initial';
import { migration002Projects } from './002_projects';
import { migration003AddOnHoldStatus } from './003_add_on_hold_status';

export interface Migration {
  version: number;
  name: string;
  up(db: Database): void;
}

export const migrations: Migration[] = [migration001Initial, migration002Projects, migration003AddOnHoldStatus];
