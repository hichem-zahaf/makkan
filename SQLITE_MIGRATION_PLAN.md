# SQLite Migration Plan for MAKKAN

## Overview

Migrate MAKKAN from in-memory document cache to SQLite database while keeping the filesystem as the source of truth for PDF files and metadata.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Frontend  │  │ API Routes  │  │  Document Service       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────────┘ │
│         │                │                     │               │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite Database (Index)                    │
│  ├─ documents (metadata, indexing)                             │
│  ├─ document_tags (many-to-many)                               │
│  ├─ tags (unique tag names)                                    │
│  ├─ categories (unique categories)                             │
│  ├─ authors (unique authors)                                   │
│  ├─ libraries                                                  │
│  └─ settings                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FTS5 Full-Text Search Table                 │   │
│  │  documents_fts (title, author, tags, notes, fileName)    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                │                     │
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   File System (Source of Truth)                 │
│  /libraries/Downloads/                                          │
│    ├─ document1.pdf                                             │
│    ├─ document1.md  (gray-matter frontmatter)                  │
│    ├─ document2.pdf                                             │
│    └─ document2.md                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Setup and Dependencies

### 1.1 Install Dependencies

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### 1.2 Create Database Schema

**File:** `lib/db/schema.sql`

```sql
-- Enable FTS5
.load statext

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
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
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
  content='',  -- Can be populated with PDF text content later
  tokenize='porter unicode61'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_read_status ON documents(read_status);
CREATE INDEX IF NOT EXISTS idx_documents_date_added ON documents(date_added);
CREATE INDEX IF NOT EXISTS idx_documents_is_favorite ON documents(is_favorite);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(
    document_id, title, author, tags, notes, file_name
  )
  SELECT
    new.id,
    new.title,
    coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
    (SELECT group_concat(t.name, ', ') FROM tags t
     JOIN document_tags dt ON t.id = dt.tag_id
     WHERE dt.document_id = new.id),
    new.notes,
    new.file_name;
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE document_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts SET
    title = new.title,
    author = coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
    tags = (SELECT group_concat(t.name, ', ') FROM tags t
            JOIN document_tags dt ON t.id = dt.tag_id
            WHERE dt.document_id = new.id),
    notes = new.notes,
    file_name = new.file_name
  WHERE document_id = new.id;
END;
```

### 1.3 Create Database Service

**File:** `lib/db/database.ts`

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { readFileSync } from 'fs';

// Database file location
const DB_PATH = path.join(process.cwd(), 'data', 'makkon.db');

let db: Database.Database | null = null;

/**
 * Get database connection (singleton)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema(database: Database.Database): void {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
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
export function getOrCreateAuthor(db: Database.Database, name: string): number {
  const stmt = db.prepare('SELECT id FROM authors WHERE name = ?');
  const result = stmt.get(name) as { id: number } | undefined;

  if (result) {
    return result.id;
  }

  const insert = db.prepare('INSERT INTO authors (name) VALUES (?)');
  return insert.run(name).lastInsertRowid as number;
}

/**
 * Get or create category ID
 */
export function getOrCreateCategory(db: Database.Database, name: string): number {
  const stmt = db.prepare('SELECT id FROM categories WHERE name = ?');
  const result = stmt.get(name) as { id: number } | undefined;

  if (result) {
    return result.id;
  }

  const insert = db.prepare('INSERT INTO categories (name) VALUES (?)');
  return insert.run(name).lastInsertRowid as number;
}

/**
 * Get or create tag ID
 */
export function getOrCreateTag(db: Database.Database, name: string): number {
  const stmt = db.prepare('SELECT id FROM tags WHERE name = ?');
  const result = stmt.get(name) as { id: number } | undefined;

  if (result) {
    return result.id;
  }

  const insert = db.prepare('INSERT INTO tags (name) VALUES (?)');
  return insert.run(name).lastInsertRowid as number;
}
```

## Phase 2: Data Synchronization

### 2.1 Create Sync Service

**File:** `services/sync-service.ts`

```typescript
import type { Document } from '../lib/types';
import { getDatabase } from '../lib/db/database';
import {
  getDocumentsByLibrary,
  refreshDocumentCache,
} from './document-service';
import { loadSettings } from './settings-service';

/**
 * Sync all documents from filesystem to SQLite
 */
export async function syncAllDocuments(): Promise<{
  added: number;
  updated: number;
  removed: number;
  errors: string[];
}> {
  const db = getDatabase();
  const settings = await loadSettings();
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let removed = 0;

  // Get all documents from filesystem
  const allDocs: Document[] = [];
  for (const library of settings.libraries) {
    const docs = await getDocumentsByLibrary(library.id);
    allDocs.push(...docs);
  }

  // Get all existing document IDs from database
  const existingIds = new Set(
    db.prepare('SELECT id FROM documents').pluck().all() as string[]
  );

  // Sync each document
  for (const doc of allDocs) {
    try {
      const wasNew = !existingIds.has(doc.id);
      syncDocument(doc);
      if (wasNew) {
        added++;
      } else {
        updated++;
      }
      existingIds.delete(doc.id);
    } catch (error) {
      errors.push(`${doc.fileName}: ${error}`);
    }
  }

  // Remove documents that no longer exist on filesystem
  for (const orphanId of existingIds) {
    try {
      db.prepare('DELETE FROM documents WHERE id = ?').run(orphanId);
      removed++;
    } catch (error) {
      errors.push(`Orphan ${orphanId}: ${error}`);
    }
  }

  return { added, updated, removed, errors };
}

/**
 * Sync a single document to database
 */
export function syncDocument(doc: Document): void {
  const db = getDatabase();
  const {
    getOrCreateAuthor,
    getOrCreateCategory,
    getOrCreateTag,
  } = require('../lib/db/database');

  const authorId = doc.metadata.author
    ? getOrCreateAuthor(db, doc.metadata.author)
    : null;
  const categoryId = doc.metadata.category
    ? getOrCreateCategory(db, doc.metadata.category)
    : null;

  const insertDoc = db.prepare(`
    INSERT INTO documents (
      id, file_name, file_path, file_size, title, author_id, category_id,
      read_status, rating, source, notes, date_added, date_modified, is_favorite
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      author_id = excluded.author_id,
      category_id = excluded.category_id,
      read_status = excluded.read_status,
      rating = excluded.rating,
      source = excluded.source,
      notes = excluded.notes,
      date_modified = excluded.date_modified,
      is_favorite = excluded.is_favorite,
      updated_at = datetime('now')
  `);

  insertDoc.run(
    doc.id,
    doc.fileName,
    doc.filePath,
    doc.fileSize,
    doc.metadata.title,
    authorId,
    categoryId,
    doc.metadata.readStatus || 'unread',
    doc.metadata.rating || null,
    doc.metadata.source || null,
    doc.metadata.notes || null,
    doc.metadata.dateAdded?.toISOString() || new Date().toISOString(),
    doc.metadata.dateModified?.toISOString() || new Date().toISOString(),
    doc.isFavorite ? 1 : 0
  );

  // Sync tags
  db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(doc.id);

  const insertTag = db.prepare(
    'INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)'
  );

  for (const tagName of doc.metadata.tags) {
    const tagId = getOrCreateTag(db, tagName);
    insertTag.run(doc.id, tagId);
  }
}

/**
 * Remove document from database
 */
export function removeDocumentFromDb(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
}

/**
 * Mark library as synced
 */
export function markLibrarySynced(libraryId: string): void {
  const db = getDatabase();
  db.prepare(
    `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`
  ).run(`library_synced_${libraryId}`, Date.now().toString());
}
```

## Phase 3: Query Service

### 3.1 Create SQLite Query Service

**File:** `services/query-service.ts`

```typescript
import type { Document, DocumentFilter, DocumentSort } from '../lib/types';
import { getDatabase } from '../lib/db/database';

/**
 * Get document by ID from SQLite
 */
export function getDocumentById(id: string): Document | null {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name,
      group_concat(t.name, ',') as tags
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN document_tags dt ON d.id = dt.document_id
    LEFT JOIN tags t ON dt.tag_id = t.id
    WHERE d.id = ?
    GROUP BY d.id
  `).get(id) as any;

  return row ? mapRowToDocument(row) : null;
}

/**
 * Get all documents with filters and sorting
 */
export function getDocuments(
  filter?: DocumentFilter,
  sort?: DocumentSort,
  limit?: number,
  offset?: number
): Document[] {
  const db = getDatabase();

  let query = `
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name,
      group_concat(t.name, ',') as tags
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN document_tags dt ON d.id = dt.document_id
    LEFT JOIN tags t ON dt.tag_id = t.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter) {
    if (filter.category) {
      conditions.push('c.name = ?');
      params.push(filter.category);
    }
    if (filter.author) {
      conditions.push('a.name = ?');
      params.push(filter.author);
    }
    if (filter.readStatus) {
      conditions.push('d.read_status = ?');
      params.push(filter.readStatus);
    }
    if (filter.rating) {
      conditions.push('d.rating >= ?');
      params.push(filter.rating);
    }
    if (filter.isFavorite !== undefined) {
      conditions.push('d.is_favorite = ?');
      params.push(filter.isFavorite ? 1 : 0);
    }
    if (filter.dateFrom) {
      conditions.push('d.date_added >= ?');
      params.push(filter.dateFrom.toISOString());
    }
    if (filter.dateTo) {
      conditions.push('d.date_added <= ?');
      params.push(filter.dateTo.toISOString());
    }
    if (filter.tags && filter.tags.length > 0) {
      const tagParams = filter.tags.map(() => '?').join(',');
      conditions.push(`d.id IN (
        SELECT document_id FROM document_tags
        JOIN tags ON document_tags.tag_id = tags.id
        WHERE tags.name IN (${tagParams})
        GROUP BY document_id
        HAVING COUNT(DISTINCT tags.id) = ?
      )`);
      params.push(...filter.tags);
      params.push(filter.tags.length);
    }
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' GROUP BY d.id';

  if (sort) {
    const sortColumn = mapSortField(sort.field);
    const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${direction}`;
  }

  if (limit) {
    query += ` LIMIT ${limit}`;
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
  }

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(mapRowToDocument);
}

/**
 * Full-text search
 */
export function searchDocuments(searchTerm: string): Document[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name,
      group_concat(t.name, ',') as tags,
      bm25(documents_fts) as rank
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN document_tags dt ON d.id = dt.document_id
    LEFT JOIN tags t ON dt.tag_id = t.id
    JOIN documents_fts fts ON d.id = fts.document_id
    WHERE documents_fts MATCH ?
    GROUP BY d.id
    ORDER BY rank
  `).all(searchTerm) as any[];

  return rows.map(mapRowToDocument);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  const db = getDatabase();
  return db.prepare('SELECT name FROM categories ORDER BY name').pluck().all() as string[];
}

/**
 * Get all unique tags
 */
export function getTags(): string[] {
  const db = getDatabase();
  return db.prepare('SELECT name FROM tags ORDER BY name').pluck().all() as string[];
}

/**
 * Get all unique authors
 */
export function getAuthors(): string[] {
  const db = getDatabase();
  return db.prepare('SELECT name FROM authors ORDER BY name').pluck().all() as string[];
}

/**
 * Get statistics
 */
export function getStats(): {
  total: number;
  byReadStatus: Record<string, number>;
  byCategory: Record<string, number>;
  totalSize: number;
} {
  const db = getDatabase();

  const total = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count;

  const byReadStatus: Record<string, number> = {
    unread: 0,
    reading: 0,
    read: 0,
  };

  const statusRows = db.prepare(`
    SELECT read_status, COUNT(*) as count
    FROM documents
    GROUP BY read_status
  `).all() as any[];

  for (const row of statusRows) {
    byReadStatus[row.read_status] = row.count;
  }

  const byCategoryRows = db.prepare(`
    SELECT c.name, COUNT(*) as count
    FROM documents d
    JOIN categories c ON d.category_id = c.id
    GROUP BY c.name
  `).all() as any[];

  const byCategory: Record<string, number> = {};
  for (const row of byCategoryRows) {
    byCategory[row.name] = row.count;
  }

  const totalSize = (db.prepare('SELECT SUM(file_size) as size FROM documents').get() as any).size || 0;

  return { total, byReadStatus, byCategory, totalSize };
}

// Helper functions
function mapRowToDocument(row: any): Document {
  return {
    id: row.id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    metadata: {
      title: row.title,
      author: row.author_name,
      category: row.category_name,
      tags: row.tags ? row.tags.split(',') : [],
      readStatus: row.read_status,
      rating: row.rating,
      source: row.source,
      notes: row.notes,
      dateAdded: new Date(row.date_added),
      dateModified: new Date(row.date_modified),
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isFavorite: row.is_favorite === 1,
  };
}

function mapSortField(field: string): string {
  const mapping: Record<string, string> = {
    title: 'd.title',
    author: 'a.name',
    dateAdded: 'd.date_added',
    dateModified: 'd.date_modified',
    fileName: 'd.file_name',
    fileSize: 'd.file_size',
    rating: 'd.rating',
    isFavorite: 'd.is_favorite',
  };
  return mapping[field] || 'd.date_added';
}
```

## Phase 4: API Migration

### 4.1 Update API Routes

Update existing API routes to use SQLite for reads:

**File:** `app/api/documents/route.ts`

```typescript
// Before: Uses document-service (filesystem scan)
import { getAllDocuments } from '@/services/document-service';

// After: Uses query-service (SQLite)
import { getDocuments, searchDocuments } from '@/services/query-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;

  if (search) {
    const docs = searchDocuments(search);
    return NextResponse.json(docs);
  }

  // Parse other filters...
  const docs = getDocuments(filter, sort, limit, offset);
  return NextResponse.json(docs);
}
```

### 4.2 Add Sync Endpoint

**File:** `app/api/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { syncAllDocuments } from '@/services/sync-service';

export async function POST(request: NextRequest) {
  try {
    const result = await syncAllDocuments();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Sync failed', details: error },
      { status: 500 }
    );
  }
}
```

## Phase 5: Initial Migration

### 5.1 Create Migration Script

**File:** scripts/migrate-to-sqlite.ts`

```typescript
import { syncAllDocuments } from '../services/sync-service';
import { closeDatabase } from '../lib/db/database';

async function migrate() {
  console.log('Starting migration to SQLite...');
  const result = await syncAllDocuments();

  console.log('\nMigration complete!');
  console.log(`  Added: ${result.added}`);
  console.log(`  Updated: ${result.updated}`);
  console.log(`  Removed: ${result.removed}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  closeDatabase();
}

migrate().catch(console.error);
```

## Migration Steps

1. **Install dependencies**: `npm install better-sqlite3`
2. **Create schema**: Add `lib/db/schema.sql`
3. **Create database service**: Add `lib/db/database.ts`
4. **Create sync service**: Add `services/sync-service.ts`
5. **Create query service**: Add `services/query-service.ts`
6. **Run initial sync**: Execute migration script
7. **Update API routes**: Migrate to use query-service
8. **Add auto-sync**: Sync on document changes
9. **Remove old cache**: Clean up in-memory cache

## Benefits

- **Fast search**: FTS5 full-text search
- **Efficient filtering**: SQL queries instead of in-memory array filtering
- **Pagination**: Built-in LIMIT/OFFSET support
- **Scalability**: Handles millions of documents
- **ACID transactions**: Reliable updates
- **Source of truth remains**: Files still primary, SQLite is index
