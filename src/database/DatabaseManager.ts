import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { migrations } from './migrations';

export class DatabaseManager {
  private _db: Database | null = null;
  private dbPath: string;
  private wasmPath: string;
  private _inTransaction: boolean = false;
  private _fileWatcher: vscode.FileSystemWatcher | null = null;
  private _onDatabaseChanged = new vscode.EventEmitter<void>();
  private _lastSaveTime: number = 0;
  private _SQL: SqlJsStatic | null = null;

  /**
   * Event that fires when the database file is changed externally (e.g., by another VSCode window).
   * Subscribers should reload their data when this event fires.
   */
  public readonly onDatabaseChanged = this._onDatabaseChanged.event;

  // Expose database for repositories
  public get db(): Database {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    return this._db;
  }

  /**
   * Returns the path to the database file.
   */
  public get databasePath(): string {
    return this.dbPath;
  }

  constructor(private context: vscode.ExtensionContext) {
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'taskscheduller.db');
    this.wasmPath = path.join(
      context.extensionUri.fsPath,
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
    this._SQL = await initSqlJs({
      locateFile: () => this.wasmPath,
    });

    // Load existing database or create new one
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this._db = new this._SQL.Database(buffer);
      console.log('Loaded existing database');
    } else {
      this._db = new this._SQL.Database();
      console.log('Created new database');
    }

    // Run migrations
    await this.runMigrations();

    // Setup file watcher to detect external changes
    this._setupFileWatcher();
  }

  /**
   * Sets up a file watcher to detect when the database file is modified externally.
   * This enables synchronization across multiple VSCode windows.
   */
  private _setupFileWatcher(): void {
    // Watch the database file for changes
    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(path.dirname(this.dbPath)),
      path.basename(this.dbPath)
    );

    this._fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    this._fileWatcher.onDidChange(() => {
      this._handleExternalChange();
    });

    this._fileWatcher.onDidCreate(() => {
      this._handleExternalChange();
    });

    console.log('Database file watcher initialized');
  }

  /**
   * Handles external changes to the database file.
   * Reloads the database from disk and notifies subscribers.
   */
  private _handleExternalChange(): void {
    // Ignore changes that were triggered by our own save operations
    // Use a 500ms threshold to account for file system delays
    const timeSinceLastSave = Date.now() - this._lastSaveTime;
    if (timeSinceLastSave < 500) {
      console.log('Ignoring self-triggered database change');
      return;
    }

    console.log('External database change detected, reloading...');
    this._reloadFromDisk();
  }

  /**
   * Reloads the database from disk.
   * Called when an external change is detected.
   */
  private _reloadFromDisk(): void {
    if (!this._SQL || !fs.existsSync(this.dbPath)) {
      return;
    }

    try {
      // Close the current database
      this._db?.close();

      // Load the updated database from disk
      const buffer = fs.readFileSync(this.dbPath);
      this._db = new this._SQL.Database(buffer);

      console.log('Database reloaded from disk');

      // Notify subscribers that the database has changed
      this._onDatabaseChanged.fire();
    } catch (error) {
      console.error('Failed to reload database:', error);
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this._db) {
      throw new Error('Database not initialized');
    }

    // Create migrations table if not exists
    this._db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get current version
    const result = this._db.exec('SELECT MAX(version) as version FROM schema_migrations');
    const currentVersion = (result[0]?.values[0]?.[0] as number) ?? 0;

    // Apply pending migrations
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying migration ${migration.name}...`);
        this._db.run('BEGIN TRANSACTION');
        try {
          migration.up(this._db);
          this._db.run('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
            migration.version,
            migration.name,
          ]);
          this._db.run('COMMIT');
          console.log(`Migration ${migration.name} applied successfully`);
        } catch (error) {
          this._db.run('ROLLBACK');
          throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`);
        }
      }
    }

    this.save();
  }

  execute(sql: string, params: unknown[] = []): void {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    this._db.run(sql, params as (string | number | null | Uint8Array)[]);
    // Don't save during transaction - will save on commit
    if (!this._inTransaction) {
      this.save();
    }
  }

  query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    const stmt = this._db.prepare(sql);
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
    if (!this._db) {
      return;
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Record the save time to prevent self-triggered reload
    this._lastSaveTime = Date.now();

    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  close(): void {
    this.save();
    this._fileWatcher?.dispose();
    this._fileWatcher = null;
    this._onDatabaseChanged.dispose();
    this._db?.close();
    this._db = null;
    console.log('Database closed');
  }

  // Transaction helper
  transaction<T>(fn: () => T): T {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    this._inTransaction = true;
    this._db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      this._db.run('COMMIT');
      this._inTransaction = false;
      this.save();
      return result;
    } catch (error) {
      this._db.run('ROLLBACK');
      this._inTransaction = false;
      throw error;
    }
  }
}
