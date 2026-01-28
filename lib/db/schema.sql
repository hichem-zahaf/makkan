-- MAKKAN SQLite Database Schema
-- This schema stores an index of documents while keeping the filesystem as source of truth

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Libraries table
CREATE TABLE IF NOT EXISTS libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  organization TEXT NOT NULL DEFAULT 'flat',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Authors table (normalized for performance)
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories table (normalized for performance)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tags table (normalized for performance)
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documents table (main metadata storage)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
  title TEXT NOT NULL,
  author_id INTEGER,
  category_id INTEGER,
  read_status TEXT NOT NULL DEFAULT 'unread' CHECK(read_status IN ('unread', 'reading', 'read')),
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  source TEXT,
  notes TEXT,
  date_added TEXT NOT NULL,
  date_modified TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK(is_favorite IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Document tags junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (document_id, tag_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Settings table (for app settings and sync tracking)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Full-text search table using FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  document_id UNINDEXED,
  title,
  author,
  tags,
  notes,
  file_name,
  content='',
  tokenize='porter unicode61'
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_read_status ON documents(read_status);
CREATE INDEX IF NOT EXISTS idx_documents_rating ON documents(rating);
CREATE INDEX IF NOT EXISTS idx_documents_date_added ON documents(date_added);
CREATE INDEX IF NOT EXISTS idx_documents_date_modified ON documents(date_modified);
CREATE INDEX IF NOT EXISTS idx_documents_is_favorite ON documents(is_favorite);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name COLLATE NOCASE);

-- Triggers to keep FTS table in sync with documents table
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(
    document_id, title, author, tags, notes, file_name
  )
  SELECT
    new.id,
    new.title,
    coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
    (SELECT group_concat(t.name, ' ') FROM tags t
     JOIN document_tags dt ON t.id = dt.tag_id
     WHERE dt.document_id = new.id),
    new.notes,
    new.file_name;
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

-- Trigger to update document_tags FTS when tags are added/removed
CREATE TRIGGER IF NOT EXISTS document_tags_fts_update AFTER INSERT ON document_tags BEGIN
  UPDATE documents_fts SET
    tags = (SELECT group_concat(t.name, ' ') FROM tags t
            JOIN document_tags dt ON t.id = dt.tag_id
            WHERE dt.document_id = NEW.document_id)
  WHERE document_id = NEW.document_id;
END;

CREATE TRIGGER IF NOT EXISTS document_tags_fts_delete AFTER DELETE ON document_tags BEGIN
  UPDATE documents_fts SET
    tags = (SELECT group_concat(t.name, ' ') FROM tags t
            JOIN document_tags dt ON t.id = dt.tag_id
            WHERE dt.document_id = OLD.document_id)
  WHERE document_id = OLD.document_id;
END;

-- Helper view for document queries
CREATE VIEW IF NOT EXISTS documents_view AS
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
GROUP BY d.id;
