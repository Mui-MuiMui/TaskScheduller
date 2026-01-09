import initSqlJs, { Database } from 'sql.js';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { migrations } from './migrations';

export class DatabaseManager {
  private db: Database | null = null;
  private dbPath: string;
  private wasmPath: string;

  constructor(private context: vscode.ExtensionContext) {
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'taskscheduller.db');
    this.wasmPath = path.join(
      context.extensionUri.fsPath,
      'node_modules',
      'sql.js',
      'dist',
      'sql-wasm.wasm'
    );
  }

  async initialize(): Promise<void> {
    // Ensure storage directory exists
    const storageDir = path.dirname(this.dbPath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Initialize sql.js with WASM
    const SQL = await initSqlJs({
      locateFile: () => this.wasmPath,
    });

    // Load existing database or create new one
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
      console.log('Loaded existing database');
    } else {
      this.db = new SQL.Database();
      console.log('Created new database');
    }

    // Run migrations
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Create migrations table if not exists
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get current version
    const result = this.db.exec('SELECT MAX(version) as version FROM schema_migrations');
    const currentVersion = (result[0]?.values[0]?.[0] as number) ?? 0;

    // Apply pending migrations
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying migration ${migration.name}...`);
        this.db.run('BEGIN TRANSACTION');
        try {
          migration.up(this.db);
          this.db.run('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
            migration.version,
            migration.name,
          ]);
          this.db.run('COMMIT');
          console.log(`Migration ${migration.name} applied successfully`);
        } catch (error) {
          this.db.run('ROLLBACK');
          throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`);
        }
      }
    }

    this.save();
  }

  execute(sql: string, params: unknown[] = []): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.run(sql, params as (string | number | null | Uint8Array)[]);
    this.save();
  }

  query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const stmt = this.db.prepare(sql);
    stmt.bind(params as (string | number | null | Uint8Array)[]);

    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  queryOne<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results[0] ?? null;
  }

  private save(): void {
    if (!this.db) {
      return;
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  close(): void {
    this.save();
    this.db?.close();
    this.db = null;
    console.log('Database closed');
  }

  // Transaction helper
  transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.db.run('COMMIT');
      this.save();
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }
}
