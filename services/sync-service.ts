/**
 * Sync Service for MAKKAN
 * Syncs filesystem documents to SQLite database
 * Filesystem remains the source of truth
 */

import type { Document } from '../lib/types';
import {
  getDatabase,
  getOrCreateAuthor,
  getOrCreateCategory,
  getOrCreateTag,
} from '../lib/db/database';
import {
  getDocumentsByLibrary,
  refreshDocumentCache,
} from './document-service';
import { loadSettings } from './settings-service';

export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  errors: string[];
  duration: number;
}

/**
 * Sync all documents from filesystem to SQLite
 */
export async function syncAllDocuments(): Promise<SyncResult> {
  const startTime = Date.now();
  const db = getDatabase();
  const settings = await loadSettings();
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let removed = 0;

  try {
    // Sync libraries first
    await syncLibraries(settings.libraries);

    // Get all documents from filesystem (with cache refresh)
    await refreshDocumentCache();
    const allDocs: Document[] = [];
    for (const library of settings.libraries) {
      const docs = await getDocumentsByLibrary(library.id);
      allDocs.push(...docs);
    }

    // Get all existing document file_paths from database
    const existingPaths = new Set(
      db.prepare('SELECT file_path FROM documents').pluck().all() as string[]
    );

    // Track which documents we've seen
    const seenPaths = new Set<string>();

    // Sync each document
    for (const doc of allDocs) {
      try {
        seenPaths.add(doc.filePath);

        const existingDoc = db.prepare('SELECT id, updated_at FROM documents WHERE file_path = ?')
          .get(doc.filePath) as { id: string; updated_at: string } | undefined;

        if (!existingDoc) {
          // New document
          syncDocument(doc);
          added++;
        } else {
          // Check if document needs update (compare file modification time)
          const docModifiedTime = new Date(doc.metadata.dateModified || doc.updatedAt).getTime();
          const dbUpdatedTime = new Date(existingDoc.updated_at).getTime();

          if (docModifiedTime > dbUpdatedTime) {
            syncDocument(doc);
            updated++;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${doc.fileName}: ${errorMsg}`);
      }
    }

    // Remove documents that no longer exist on filesystem
    for (const orphanPath of existingPaths) {
      if (!seenPaths.has(orphanPath)) {
        try {
          db.prepare('DELETE FROM documents WHERE file_path = ?').run(orphanPath);
          removed++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Orphan ${orphanPath}: ${errorMsg}`);
        }
      }
    }

    // Clean up orphaned authors, categories, tags
    cleanupOrphans(db);
  } catch (error) {
    errors.push(`Sync failed: ${error}`);
  }

  const duration = Date.now() - startTime;

  return { added, updated, removed, errors, duration };
}

/**
 * Sync a single document to database
 */
export function syncDocument(doc: Document): void {
  const db = getDatabase();

  const authorId = doc.metadata.author
    ? getOrCreateAuthor(db, doc.metadata.author)
    : null;
  const categoryId = doc.metadata.category
    ? getOrCreateCategory(db, doc.metadata.category)
    : null;

  const upsertDoc = db.prepare(`
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
      date_added = excluded.date_added,
      date_modified = excluded.date_modified,
      is_favorite = excluded.is_favorite,
      updated_at = datetime('now')
  `);

  const dateAdded = doc.metadata.dateAdded instanceof Date
    ? doc.metadata.dateAdded.toISOString()
    : doc.metadata.dateAdded || new Date().toISOString();

  const dateModified = doc.metadata.dateModified instanceof Date
    ? doc.metadata.dateModified.toISOString()
    : doc.metadata.dateModified || new Date().toISOString();

  upsertDoc.run(
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
    dateAdded,
    dateModified,
    doc.isFavorite ? 1 : 0
  );

  // Sync tags - remove old tags and add new ones
  db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(doc.id);

  if (doc.metadata.tags && doc.metadata.tags.length > 0) {
    const insertTag = db.prepare(
      'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)'
    );

    for (const tagName of doc.metadata.tags) {
      const tagId = getOrCreateTag(db, tagName);
      insertTag.run(doc.id, tagId);
    }
  }
}

/**
 * Remove document from database
 */
export function removeDocumentFromDb(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Remove document from database by file path
 */
export function removeDocumentByPath(filePath: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM documents WHERE file_path = ?').run(filePath);
  return result.changes > 0;
}

/**
 * Sync libraries to database
 */
async function syncLibraries(libraries: Array<{ id: string; name: string; path: string; organization: string }>): Promise<void> {
  const db = getDatabase();

  const upsertLibrary = db.prepare(`
    INSERT INTO libraries (id, name, path, organization)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      id = excluded.id,
      name = excluded.name,
      organization = excluded.organization,
      updated_at = datetime('now')
  `);

  for (const library of libraries) {
    upsertLibrary.run(library.id, library.name, library.path, library.organization);
  }

  // Remove libraries that no longer exist in settings
  const libraryPaths = libraries.map(lib => lib.path);
  if (libraryPaths.length > 0) {
    const placeholders = libraryPaths.map(() => '?').join(',');
    db.prepare(`DELETE FROM libraries WHERE path NOT IN (${placeholders})`).run(...libraryPaths);
  } else {
    db.prepare('DELETE FROM libraries').run();
  }
}

/**
 * Clean up orphaned authors, categories, and tags
 */
function cleanupOrphans(db: any): void {
  // Delete authors with no documents
  db.prepare(`
    DELETE FROM authors
    WHERE id NOT IN (SELECT DISTINCT author_id FROM documents WHERE author_id IS NOT NULL)
  `).run();

  // Delete categories with no documents
  db.prepare(`
    DELETE FROM categories
    WHERE id NOT IN (SELECT DISTINCT category_id FROM documents WHERE category_id IS NOT NULL)
  `).run();

  // Delete tags with no documents
  db.prepare(`
    DELETE FROM tags
    WHERE id NOT IN (SELECT DISTINCT tag_id FROM document_tags)
  `).run();
}

/**
 * Get sync status for a library
 */
export function getLibrarySyncStatus(libraryId: string): {
  lastSync: number | null;
  documentCount: number;
} {
  const db = getDatabase();

  const setting = db.prepare('SELECT value, updated_at FROM settings WHERE key = ?')
    .get(`library_synced_${libraryId}`) as { value: string; updated_at: string } | undefined;

  const documentCount = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count;

  return {
    lastSync: setting ? parseInt(setting.value, 10) : null,
    documentCount,
  };
}

/**
 * Mark library as synced
 */
export function markLibrarySynced(libraryId: string): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(`library_synced_${libraryId}`, Date.now().toString());
}

/**
 * Sync a single library
 */
export async function syncLibrary(libraryId: string): Promise<SyncResult> {
  const settings = await loadSettings();
  const library = settings.libraries.find(lib => lib.id === libraryId);

  if (!library) {
    return {
      added: 0,
      updated: 0,
      removed: 0,
      errors: [`Library ${libraryId} not found`],
      duration: 0,
    };
  }

  const startTime = Date.now();
  const db = getDatabase();
  const errors: string[] = [];
  let added = 0;
  let updated = 0;

  try {
    // Sync library info
    await syncLibraries([library]);

    // Get documents from this library
    await refreshDocumentCache();
    const docs = await getDocumentsByLibrary(libraryId);

    // Get existing document paths for this library
    const existingPaths = new Set(
      db.prepare('SELECT file_path FROM documents WHERE file_path LIKE ?')
        .all(`${library.path}%`)
        .map((row: any) => row.file_path)
    );

    const seenPaths = new Set<string>();

    // Sync each document
    for (const doc of docs) {
      try {
        seenPaths.add(doc.filePath);

        const isNew = !existingPaths.has(doc.filePath);
        syncDocument(doc);

        if (isNew) {
          added++;
        } else {
          updated++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${doc.fileName}: ${errorMsg}`);
      }
    }

    // Remove documents that no longer exist in this library
    for (const orphanPath of existingPaths) {
      if (!seenPaths.has(orphanPath)) {
        try {
          db.prepare('DELETE FROM documents WHERE file_path = ?').run(orphanPath);
        } catch (error) {
          // Ignore errors
        }
      }
    }

    // Mark as synced
    markLibrarySynced(libraryId);

    // Cleanup orphans
    cleanupOrphans(db);
  } catch (error) {
    errors.push(`Library sync failed: ${error}`);
  }

  const duration = Date.now() - startTime;

  return { added, updated, removed: 0, errors, duration };
}

/**
 * Quick sync - only update documents that have been modified
 * More efficient than full sync for frequent updates
 */
export async function quickSync(): Promise<SyncResult> {
  const startTime = Date.now();
  const db = getDatabase();
  const errors: string[] = [];
  let added = 0;
  let updated = 0;

  try {
    const settings = await loadSettings();

    for (const library of settings.libraries) {
      const docs = await getDocumentsByLibrary(library.id);

      for (const doc of docs) {
        try {
          const existing = db.prepare('SELECT updated_at FROM documents WHERE file_path = ?')
            .get(doc.filePath) as { updated_at: string } | undefined;

          if (!existing) {
            syncDocument(doc);
            added++;
          } else {
            const docModifiedTime = new Date(doc.metadata.dateModified || doc.updatedAt).getTime();
            const dbUpdatedTime = new Date(existing.updated_at).getTime();

            if (docModifiedTime > dbUpdatedTime) {
              syncDocument(doc);
              updated++;
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`${doc.fileName}: ${errorMsg}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Quick sync failed: ${error}`);
  }

  const duration = Date.now() - startTime;

  return { added, updated, removed: 0, errors, duration };
}
