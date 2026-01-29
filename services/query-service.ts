/**
 * Query Service for MAKKAN
 * Provides SQLite-based queries for documents
 * Replaces in-memory filtering with efficient SQL queries
 */

import type { Document, DocumentFilter, DocumentSort, ReadStatus } from '../lib/types';
import {
  getDatabase,
  getAuthorById,
  getCategoryById,
  getDocumentTags,
} from '../lib/db/database';

/**
 * Get document by ID from SQLite
 */
export function getDocumentById(id: string): Document | null {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.id = ?
  `).get(id) as any;

  if (!row) {
    return null;
  }

  return mapRowToDocument(row);
}

/**
 * Get document by file path
 */
export function getDocumentByPath(filePath: string): Document | null {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.file_path = ?
  `).get(filePath) as any;

  if (!row) {
    return null;
  }

  return mapRowToDocument(row);
}

/**
 * Get all documents with optional filters and sorting
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
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter) {
    if (filter.category) {
      conditions.push('c.name = ? COLLATE NOCASE');
      params.push(filter.category);
    }
    if (filter.author) {
      conditions.push('a.name = ? COLLATE NOCASE');
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
      const dateFromStr = typeof filter.dateFrom === 'string'
        ? filter.dateFrom
        : (filter.dateFrom as Date).toISOString();
      params.push(dateFromStr);
    }
    if (filter.dateTo) {
      conditions.push('d.date_added <= ?');
      const dateToStr = typeof filter.dateTo === 'string'
        ? filter.dateTo
        : (filter.dateTo as Date).toISOString();
      params.push(dateToStr);
    }
    if (filter.fileTypes && filter.fileTypes.length > 0) {
      const typeParams = filter.fileTypes.map(() => '?').join(',');
      conditions.push(`d.file_type IN (${typeParams})`);
      params.push(...filter.fileTypes);
    }
    if (filter.tags && filter.tags.length > 0) {
      const tagParams = filter.tags.map(() => '?').join(',');
      conditions.push(`d.id IN (
        SELECT document_id FROM document_tags
        JOIN tags ON document_tags.tag_id = tags.id
        WHERE tags.name COLLATE NOCASE IN (${tagParams})
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

  // Add grouping
  query += ' GROUP BY d.id';

  // Add sorting
  if (sort) {
    const sortColumn = mapSortField(sort.field);
    const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${direction}`;
  } else {
    // Default sorting: date added DESC
    query += ' ORDER BY d.date_added DESC';
  }

  // Add pagination
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
 * Get total count of documents matching filter
 */
export function getDocumentCount(filter?: DocumentFilter): number {
  const db = getDatabase();

  let query = 'SELECT COUNT(DISTINCT d.id) as count FROM documents d';
  query += ' LEFT JOIN authors a ON d.author_id = a.id';
  query += ' LEFT JOIN categories c ON d.category_id = c.id';
  query += ' LEFT JOIN document_tags dt ON d.id = dt.document_id';
  query += ' LEFT JOIN tags t ON dt.tag_id = t.id';

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter) {
    if (filter.category) {
      conditions.push('c.name = ? COLLATE NOCASE');
      params.push(filter.category);
    }
    if (filter.author) {
      conditions.push('a.name = ? COLLATE NOCASE');
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
      const dateFromStr = typeof filter.dateFrom === 'string'
        ? filter.dateFrom
        : (filter.dateFrom as Date).toISOString();
      params.push(dateFromStr);
    }
    if (filter.dateTo) {
      conditions.push('d.date_added <= ?');
      const dateToStr = typeof filter.dateTo === 'string'
        ? filter.dateTo
        : (filter.dateTo as Date).toISOString();
      params.push(dateToStr);
    }
    if (filter.fileTypes && filter.fileTypes.length > 0) {
      const typeParams = filter.fileTypes.map(() => '?').join(',');
      conditions.push(`d.file_type IN (${typeParams})`);
      params.push(...filter.fileTypes);
    }
    if (filter.tags && filter.tags.length > 0) {
      const tagParams = filter.tags.map(() => '?').join(',');
      conditions.push(`d.id IN (
        SELECT document_id FROM document_tags
        JOIN tags ON document_tags.tag_id = tags.id
        WHERE tags.name COLLATE NOCASE IN (${tagParams})
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

  const result = db.prepare(query).get(...params) as { count: number };
  return result.count;
}

/**
 * Full-text search using FTS5
 */
export function searchDocuments(
  searchTerm: string,
  limit?: number,
  offset?: number
): Document[] {
  const db = getDatabase();

  // Use FTS5 search with BM25 ranking
  let query = `
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name,
      bm25(documents_fts) as rank
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    JOIN documents_fts fts ON d.id = fts.document_id
    WHERE documents_fts MATCH ?
    GROUP BY d.id
    ORDER BY rank, d.date_added DESC
  `;

  if (limit) {
    query += ` LIMIT ${limit}`;
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
  }

  try {
    const rows = db.prepare(query).all(searchTerm + '*') as any[];
    return rows.map(mapRowToDocument);
  } catch (error) {
    // Fallback to simple LIKE search if FTS fails
    return fallbackSearch(searchTerm, limit, offset);
  }
}

/**
 * Fallback search using LIKE (for when FTS query fails)
 */
function fallbackSearch(searchTerm: string, limit?: number, offset?: number): Document[] {
  const db = getDatabase();
  const searchTermLower = searchTerm.toLowerCase();

  let query = `
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE (
      LOWER(d.title) LIKE ?
      OR LOWER(a.name) LIKE ?
      OR LOWER(d.file_name) LIKE ?
      OR LOWER(d.notes) LIKE ?
    )
    GROUP BY d.id
    ORDER BY d.date_added DESC
  `;

  const searchPattern = `%${searchTermLower}%`;

  if (limit) {
    query += ` LIMIT ${limit}`;
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
  }

  const rows = db.prepare(query).all(searchPattern, searchPattern, searchPattern, searchPattern) as any[];
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
 * Get search suggestions based on query
 * Searches across titles, authors, tags, and categories
 */
export function getSearchSuggestions(query: string, limit: number = 5): string[] {
  if (!query.trim()) {
    return [];
  }

  const db = getDatabase();
  const searchTerm = `${query}*`; // FTS5 prefix search

  // Get unique values from all searchable fields
  const suggestions = new Set<string>();

  // Search titles
  const titles = db.prepare(`
    SELECT DISTINCT title FROM documents_fts
    WHERE title MATCH ?
    LIMIT ?
  `).all(searchTerm, Math.ceil(limit / 4)) as { title: string }[];

  for (const row of titles) {
    suggestions.add(row.title);
  }

  // Search authors
  const authors = db.prepare(`
    SELECT DISTINCT name FROM authors
    WHERE name LIKE ?
    LIMIT ?
  `).all(`%${query}%`, Math.ceil(limit / 4)) as { name: string }[];

  for (const row of authors) {
    suggestions.add(row.name);
  }

  // Search tags
  const tags = db.prepare(`
    SELECT DISTINCT name FROM tags
    WHERE name LIKE ?
    LIMIT ?
  `).all(`%${query}%`, Math.ceil(limit / 4)) as { name: string }[];

  for (const row of tags) {
    suggestions.add(row.name);
  }

  // Search categories
  const categories = db.prepare(`
    SELECT DISTINCT name FROM categories
    WHERE name LIKE ?
    LIMIT ?
  `).all(`%${query}%`, Math.ceil(limit / 4)) as { name: string }[];

  for (const row of categories) {
    suggestions.add(row.name);
  }

  return Array.from(suggestions).slice(0, limit);
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
 * Get document statistics
 */
export function getStats(): {
  total: number;
  byReadStatus: Record<ReadStatus, number>;
  byCategory: Record<string, number>;
  byAuthor: Record<string, number>;
  byTag: Record<string, number>;
  totalSize: number;
  favoriteCount: number;
} {
  const db = getDatabase();

  const total = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count;

  const byReadStatus: Record<ReadStatus, number> = {
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
    byReadStatus[row.read_status as ReadStatus] = row.count;
  }

  const byCategoryRows = db.prepare(`
    SELECT c.name, COUNT(*) as count
    FROM documents d
    JOIN categories c ON d.category_id = c.id
    GROUP BY c.name
    ORDER BY count DESC
  `).all() as any[];

  const byCategory: Record<string, number> = {};
  for (const row of byCategoryRows) {
    byCategory[row.name] = row.count;
  }

  const byAuthorRows = db.prepare(`
    SELECT a.name, COUNT(*) as count
    FROM documents d
    JOIN authors a ON d.author_id = a.id
    GROUP BY a.name
    ORDER BY count DESC
  `).all() as any[];

  const byAuthor: Record<string, number> = {};
  for (const row of byAuthorRows) {
    byAuthor[row.name] = row.count;
  }

  const byTagRows = db.prepare(`
    SELECT t.name, COUNT(*) as count
    FROM document_tags dt
    JOIN tags t ON dt.tag_id = t.id
    GROUP BY t.name
    ORDER BY count DESC
  `).all() as any[];

  const byTag: Record<string, number> = {};
  for (const row of byTagRows) {
    byTag[row.name] = row.count;
  }

  const totalSize = (db.prepare('SELECT SUM(file_size) as size FROM documents').get() as any).size || 0;
  const favoriteCount = (db.prepare('SELECT COUNT(*) as count FROM documents WHERE is_favorite = 1').get() as any).count;

  return {
    total,
    byReadStatus,
    byCategory,
    byAuthor,
    byTag,
    totalSize,
    favoriteCount,
  };
}

/**
 * Get recent documents (added in the last N days)
 */
export function getRecentDocuments(days: number = 7, limit: number = 20): Document[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE datetime(d.date_added) >= datetime('now', '-' || ? || ' days')
    ORDER BY d.date_added DESC
    LIMIT ?
  `).all(days, limit) as any[];

  return rows.map(mapRowToDocument);
}

/**
 * Get favorite documents
 */
export function getFavoriteDocuments(limit?: number, offset?: number): Document[] {
  const db = getDatabase();

  let query = `
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.is_favorite = 1
    ORDER BY d.date_added DESC
  `;

  if (limit) {
    query += ` LIMIT ${limit}`;
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
  }

  const rows = db.prepare(query).all() as any[];
  return rows.map(mapRowToDocument);
}

/**
 * Get documents by reading status
 */
export function getDocumentsByStatus(status: ReadStatus, limit?: number, offset?: number): Document[] {
  const filter: DocumentFilter = { readStatus: status };
  return getDocuments(filter, { field: 'dateModified', direction: 'desc' }, limit, offset);
}

/**
 * Get similar documents based on tags and category
 */
export function getSimilarDocuments(documentId: string, limit: number = 5): Document[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name,
      COUNT(DISTINCT t.id) as shared_tags
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN document_tags dt ON d.id = dt.document_id
    LEFT JOIN tags t ON dt.tag_id = t.id
    WHERE d.id != ?
      AND t.id IN (
        SELECT tag_id FROM document_tags WHERE document_id = ?
      )
    GROUP BY d.id
    ORDER BY shared_tags DESC, d.date_added DESC
    LIMIT ?
  `).all(documentId, documentId, limit) as any[];

  return rows.map(mapRowToDocument);
}

/**
 * Get random documents
 */
export function getRandomDocuments(limit: number = 10): Document[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT
      d.*,
      a.name as author_name,
      c.name as category_name
    FROM documents d
    LEFT JOIN authors a ON d.author_id = a.id
    LEFT JOIN categories c ON d.category_id = c.id
    ORDER BY RANDOM()
    LIMIT ?
  `).all(limit) as any[];

  return rows.map(mapRowToDocument);
}

/**
 * Check if database has been populated
 */
export function isDatabasePopulated(): boolean {
  const db = getDatabase();
  const count = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count;
  return count > 0;
}

// Helper functions

/**
 * Map database row to Document object
 */
function mapRowToDocument(row: any): Document {
  const tags = getDocumentTags(getDatabase(), row.id);

  return {
    id: row.id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    metadata: {
      title: row.title,
      author: row.author_name,
      category: row.category_name,
      tags,
      readStatus: row.read_status as ReadStatus,
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

/**
 * Map sort field to database column
 */
function mapSortField(field: string): string {
  const mapping: Record<string, string> = {
    title: 'd.title COLLATE NOCASE',
    author: 'a.name COLLATE NOCASE',
    dateAdded: 'd.date_added',
    dateModified: 'd.date_modified',
    fileName: 'd.file_name COLLATE NOCASE',
    fileSize: 'd.file_size',
    rating: 'd.rating',
    isFavorite: 'd.is_favorite',
  };
  return mapping[field] || 'd.date_added';
}
