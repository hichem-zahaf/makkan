-- Migration: Add file_type column to documents table
-- This migration adds support for multi-file type detection

-- Add file_type column
ALTER TABLE documents ADD COLUMN file_type TEXT;

-- Create index for file_type
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Update existing records based on file extension
UPDATE documents SET file_type = 'pdf' WHERE file_name LIKE '%.pdf';
UPDATE documents SET file_type = 'image' WHERE file_name LIKE '%.jpg' OR file_name LIKE '%.jpeg' OR file_name LIKE '%.png' OR file_name LIKE '%.gif';
UPDATE documents SET file_type = 'video' WHERE file_name LIKE '%.mp4' OR file_name LIKE '%.avi' OR file_name LIKE '%.mkv';
UPDATE documents SET file_type = 'audio' WHERE file_name LIKE '%.mp3' OR file_name LIKE '%.wav' OR file_name LIKE '%.flac';
UPDATE documents SET file_type = 'document' WHERE file_name LIKE '%.doc%' OR file_name LIKE '%.xls%' OR file_name LIKE '%.ppt%';
UPDATE documents SET file_type = 'text' WHERE file_name LIKE '%.txt' OR file_name LIKE '%.md' OR file_name LIKE '%.log';
UPDATE documents SET file_type = 'code' WHERE file_name LIKE '%.js' OR file_name LIKE '%.ts' OR file_name LIKE '%.py' OR file_name LIKE '%.java';
UPDATE documents SET file_type = 'archive' WHERE file_name LIKE '%.zip' OR file_name LIKE '%.rar' OR file_name LIKE '%.7z';
UPDATE documents SET file_type = 'unknown' WHERE file_type IS NULL;

-- Rebuild FTS virtual table to include file_type
DROP TABLE IF EXISTS documents_fts;
CREATE VIRTUAL TABLE documents_fts USING fts5(
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

-- Recreate FTS triggers
DROP TRIGGER IF EXISTS documents_fts_insert;
DROP TRIGGER IF EXISTS documents_fts_delete;
DROP TRIGGER IF EXISTS documents_fts_update;

CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(
    document_id, title, author, tags, notes, file_name, file_type
  )
  SELECT
    new.id,
    new.title,
    coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
    (SELECT group_concat(t.name, ' ') FROM tags t
     JOIN document_tags dt ON t.id = dt.tag_id
     WHERE dt.document_id = new.id),
    new.notes,
    new.file_name,
    new.file_type;
END;

CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE document_id = old.id;
END;

CREATE TRIGGER documents_fts_update AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts SET
    title = new.title,
    author = coalesce((SELECT name FROM authors WHERE id = new.author_id), ''),
    tags = (SELECT group_concat(t.name, ' ') FROM tags t
            JOIN document_tags dt ON t.id = dt.tag_id
            WHERE dt.document_id = new.id),
    notes = new.notes,
    file_name = new.file_name,
    file_type = new.file_type
  WHERE document_id = new.id;
END;

-- Populate FTS table with existing data
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
LEFT JOIN authors a ON d.author_id = a.id;
