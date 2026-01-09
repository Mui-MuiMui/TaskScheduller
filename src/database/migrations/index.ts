import type { Database } from 'sql.js';
import { migration001Initial } from './001_initial';

export interface Migration {
  version: number;
  name: string;
  up(db: Database): void;
}

export const migrations: Migration[] = [migration001Initial];
