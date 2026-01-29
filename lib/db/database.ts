/**
 * SQLite Database Service for MAKKAN
 * Provides database connection management and helper functions
 */

import Database from 'better-sqlite3';
import path from 'path';
import { readFileSync } from 'fs';
import { promises as fs } from 'fs';

// Database file location
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'makkon.db');

let db: Database.Database | null = null;

/**
 * Get database connection (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    initializeDatabase();
  }
  return db!;
}

/**
 * Initialize database with schema
 */
function initializeDatabase(): void {
  // Ensure data directory exists
  if (!require('fs').existsSync(DB_DIR)) {
    require('fs').mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Set busy timeout (5 seconds)
  db.pragma('busy_timeout = 5000');

  // Initialize schema
  initializeSchema(db);
}

/**
 * Initialize database schema from SQL file
 */
function initializeSchema(database: Database.Database): void {
  const schemaPath = path.join(__dirname, 'schema.sql');

  try {
    const schema = readFileSync(schemaPath, 'utf-8');
    database.exec(schema);
  } catch (error) {
    // If schema file doesn't exist, we'll create tables programmatically
    createSchemaProgrammatically(database);
  }
}

/**
 * Create schema programmatically (fallback)
 */
function createSchemaProgrammatically(database: Database.Database): void {
  database.exec(`
    -- Libraries table
    CREATE TABLE IF NOT EXISTS libraries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      organization TEXT NOT NULL DEFAULT 'flat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Authors table
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Tags table
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Documents table
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      file_type TEXT,
      title TEXT NOT NULL,
      author_id INTEGER,
      category_id INTEGER,
      read_status TEXT NOT NULL DEFAULT 'unread',
      rating INTEGER,
      source TEXT,
      notes TEXT,
      date_added TEXT NOT NULL,
      date_modified TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Document tags junction table
    CREATE TABLE IF NOT EXISTS document_tags (
      document_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (document_id, tag_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Full-text search table
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      document_id UNINDEXED,
      title,
      author,
      tags,
      notes,
      file_name,
      file_type,
      content='',
      tokenize='porter unicode61'
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
    CREATE INDEX IF NOT EXISTS idx_documents_read_status ON documents(read_status);
    CREATE INDEX IF NOT EXISTS idx_documents_rating ON documents(rating);
    CREATE INDEX IF NOT EXISTS idx_documents_date_added ON documents(date_added);
    CREATE INDEX IF NOT EXISTS idx_documents_date_modified ON documents(date_modified);
    CREATE INDEX IF NOT EXISTS idx_documents_is_favorite ON documents(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

    -- FTS sync triggers
    CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(document_id, title, author, tags, notes, file_name, file_type)
      SELECT new.id, new.title,
        coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
        (SELECT group_concat(t.name, ' ') FROM tags t
         JOIN document_tags dt ON t.id = dt.tag_id
         WHERE dt.document_id = new.id),
        new.notes, new.file_name, new.file_type;
    END;

    CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
      DELETE FROM documents_fts WHERE document_id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
      UPDATE documents_fts SET
        title = new.title,
        author = coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
        tags = (SELECT group_concat(t.name, ' ') FROM tags t
                JOIN document_tags dt ON t.id = dt.tag_id
                WHERE dt.document_id = new.id),
        notes = new.notes,
        file_name = new.file_name
      WHERE document_id = new.id;
    END;
  `);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get or create author ID
 */
export function getOrCreateAuthor(database: Database.Database, name: string): number {
  const stmt = database.prepare('SELECT id FROM authors WHERE name = ? COLLATE NOCASE');
  const result = stmt.get(name) as { id: number } | undefined;

  if (result) {
    return result.id;
  }

  const insert = database.prepare('INSERT INTO authors (name) VALUES (?)');
  return insert.run(name).lastInsertRowid as number;
}

/**
 * Get or create category ID
 */
export function getOrCreateCategory(database: Database.Database, name: string): number {
  const stmt = database.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE');
  const result = stmt.get(name) as { id: number } | undefined;

  if (result) {
    return result.id;
  }

  const insert = database.prepare('INSERT INTO categories (name) VALUES (?)');
  return insert.run(name).lastInsertRowid as number;
}

/**
 * Get or create tag ID
 */
export function getOrCreateTag(database: Database.Database, name: string): number {
  const stmt = database.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');
  const result = stmt.get(name) as { id: number } | undefined;

  if (result) {
    return result.id;
  }

  const insert = database.prepare('INSERT INTO tags (name) VALUES (?)');
  return insert.run(name).lastInsertRowid as number;
}

/**
 * Get author by ID
 */
export function getAuthorById(database: Database.Database, id: number | null): string | null {
  if (!id) return null;
  const stmt = database.prepare('SELECT name FROM authors WHERE id = ?');
  const result = stmt.get(id) as { name: string } | undefined;
  return result?.name || null;
}

/**
 * Get category by ID
 */
export function getCategoryById(database: Database.Database, id: number | null): string | null {
  if (!id) return null;
  const stmt = database.prepare('SELECT name FROM categories WHERE id = ?');
  const result = stmt.get(id) as { name: string } | undefined;
  return result?.name || null;
}

/**
 * Get tags for a document
 */
export function getDocumentTags(database: Database.Database, documentId: string): string[] {
  const stmt = database.prepare(`
    SELECT t.name FROM tags t
    JOIN document_tags dt ON t.id = dt.tag_id
    WHERE dt.document_id = ?
    ORDER BY t.name
  `);
  const rows = stmt.all(documentId) as { name: string }[];
  return rows.map(r => r.name);
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  documentCount: number;
  authorCount: number;
  categoryCount: number;
  tagCount: number;
  libraryCount: number;
  dbSize: number;
} {
  const database = getDatabase();

  const documentCount = (database.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count;
  const authorCount = (database.prepare('SELECT COUNT(*) as count FROM authors').get() as any).count;
  const categoryCount = (database.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count;
  const tagCount = (database.prepare('SELECT COUNT(*) as count FROM tags').get() as any).count;
  const libraryCount = (database.prepare('SELECT COUNT(*) as count FROM libraries').get() as any).count;

  // Get database file size
  let dbSize = 0;
  try {
    const stats = require('fs').statSync(DB_PATH);
    dbSize = stats.size;
  } catch {
    // File doesn't exist yet
  }

  return {
    documentCount,
    authorCount,
    categoryCount,
    tagCount,
    libraryCount,
    dbSize,
  };
}

/**
 * Rebuild the full-text search index
 */
export function rebuildFtsIndex(): void {
  const database = getDatabase();

  // Clear FTS table
  database.prepare('DELETE FROM documents_fts').run();

  // Rebuild from documents
  database.prepare(`
    INSERT INTO documents_fts(document_id, title, author, tags, notes, file_name, file_type)
    SELECT
      d.id,
      d.title,
      coalesce(a.name, ''),
      (SELECT group_concat(t.name, ' ') FROM tags t
       JOIN document_tags dt ON t.id = dt.tag_id
       WHERE dt.document_id = d.id),
      d.notes,
      d.file_name,
      d.file_type
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
  `).run();
}

/**
 * Vacuum database to reclaim space
 */
export function vacuumDatabase(): void {
  const database = getDatabase();
  database.pragma('wal_checkpoint(TRUNCATE)');
  database.exec('VACUUM');
}

/**
 * Get database path
 */
export function getDatabasePath(): string {
  return DB_PATH;
}

/**
 * Check if database exists
 */
export function databaseExists(): boolean {
  return require('fs').existsSync(DB_PATH);
}

/**
 * Delete database (use with caution!)
 */
export async function deleteDatabase(): Promise<void> {
  closeDatabase();

  // Delete main database file
  try {
    await fs.unlink(DB_PATH);
  } catch {
    // File doesn't exist
  }

  // Delete WAL files
  try {
    await fs.unlink(DB_PATH + '-wal');
  } catch {
    // File doesn't exist
  }

  try {
    await fs.unlink(DB_PATH + '-shm');
  } catch {
    // File doesn't exist
  }
}

/**
 * Export database to JSON
 */
export function exportDatabaseToJson(): {
  documents: any[];
  authors: any[];
  categories: any[];
  tags: any[];
  libraries: any[];
} {
  const database = getDatabase();

  return {
    documents: database.prepare('SELECT * FROM documents').all(),
    authors: database.prepare('SELECT * FROM authors').all(),
    categories: database.prepare('SELECT * FROM categories').all(),
    tags: database.prepare('SELECT * FROM tags').all(),
    libraries: database.prepare('SELECT * FROM libraries').all(),
  };
}

/**
 * Get document count by library path
 */
export function getDocumentCountByLibraryPath(libraryPath: string): number {
  const db = getDatabase();
  const normalizedPath = libraryPath.replace(/\\/g, '/');
  const result = db.prepare('SELECT COUNT(*) as count FROM documents WHERE file_path LIKE ?')
    .get(`${normalizedPath}%`) as { count: number };
  return result.count;
}

/**
 * Delete all documents associated with a library path
 */
export function deleteDocumentsByLibraryPath(libraryPath: string): number {
  const db = getDatabase();
  const normalizedPath = libraryPath.replace(/\\/g, '/');
  const result = db.prepare('DELETE FROM documents WHERE file_path LIKE ?')
    .run(`${normalizedPath}%`);
  return result.changes;
}

/**
 * Get document by ID
 */
export function getDocumentById(id: string): any {
  const db = getDatabase();
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
}
