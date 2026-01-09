import type { Database } from 'sql.js';
import { migration001Initial } from './001_initial';
import { migration002Projects } from './002_projects';

export interface Migration {
  version: number;
  name: string;
  up(db: Database): void;
}

export const migrations: Migration[] = [migration001Initial, migration002Projects];
