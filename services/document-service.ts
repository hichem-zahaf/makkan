import { promises as fs } from 'fs';
import type { Document, DocumentFilter, DocumentSort, ReadStatus } from '../lib/types';
import {
  scanDirectoryForDocuments,
  writeMarkdownFile,
  readMarkdownFile,
  frontmatterToMetadata,
  getCompanionMarkdownPath,
} from '../lib/fs';
import { loadSettings } from './settings-service';

/**
 * In-memory document cache
 * Maps library ID to array of documents
 */
const documentCache = new Map<string, Document[]>();

/**
 * Get all documents from all libraries
 */
export async function getAllDocuments(): Promise<Document[]> {
  const settings = await loadSettings();
  const allDocuments: Document[] = [];

  for (const library of settings.libraries) {
    const documents = await getDocumentsByLibrary(library.id);
    allDocuments.push(...documents);
  }

  return allDocuments;
}

/**
 * Get documents from a specific library
 */
export async function getDocumentsByLibrary(libraryId: string): Promise<Document[]> {
  // Check cache first
  if (documentCache.has(libraryId)) {
    return documentCache.get(libraryId)!;
  }

  const settings = await loadSettings();
  const library = settings.libraries.find((lib) => lib.id === libraryId);

  if (!library) {
    return [];
  }

  const result = await scanDirectoryForDocuments(library.path);
  documentCache.set(libraryId, result.documents);
  return result.documents;
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(id: string): Promise<Document | null> {
  const allDocuments = await getAllDocuments();
  return allDocuments.find((doc) => doc.id === id) || null;
}

/**
 * Filter and sort documents
 */
export async function getFilteredDocuments(
  filter?: DocumentFilter,
  sort?: DocumentSort
): Promise<Document[]> {
  let documents = await getAllDocuments();

  // Apply filters
  if (filter) {
    documents = applyFilters(documents, filter);
  }

  // Apply sorting
  if (sort) {
    documents = applySorting(documents, sort);
  }

  return documents;
}

/**
 * Apply filters to documents
 */
function applyFilters(documents: Document[], filter: DocumentFilter): Document[] {
  let filtered = [...documents];

  // Search filter (also checks query parameter)
  const searchQuery = filter.query || filter.search;
  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    filtered = filtered.filter((doc) => {
      return (
        doc.metadata.title.toLowerCase().includes(searchLower) ||
        doc.metadata.author?.toLowerCase().includes(searchLower) ||
        doc.metadata.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        doc.metadata.notes?.toLowerCase().includes(searchLower) ||
        doc.metadata.category?.toLowerCase().includes(searchLower) ||
        doc.metadata.project?.toLowerCase().includes(searchLower) ||
        doc.metadata.language?.toLowerCase().includes(searchLower) ||
        doc.fileName.toLowerCase().includes(searchLower) ||
        doc.filePath.toLowerCase().includes(searchLower)
      );
    });
  }

  // Category filter
  if (filter.category) {
    filtered = filtered.filter((doc) => doc.metadata.category === filter.category);
  }

  // Tags filter (documents must have all specified tags)
  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter((doc) =>
      filter.tags!.every((tag) => doc.metadata.tags.includes(tag))
    );
  }

  // Author filter
  if (filter.author) {
    filtered = filtered.filter((doc) => doc.metadata.author === filter.author);
  }

  // Read status filter
  if (filter.readStatus) {
    filtered = filtered.filter((doc) => doc.metadata.readStatus === filter.readStatus);
  }

  // Rating filter (minimum rating)
  if (filter.rating) {
    filtered = filtered.filter(
      (doc) => (doc.metadata.rating || 0) >= filter.rating!
    );
  }

  // Date range filter
  if (filter.dateFrom) {
    const fromDate = typeof filter.dateFrom === 'string' ? new Date(filter.dateFrom) : filter.dateFrom;
    filtered = filtered.filter(
      (doc) => (doc.metadata.dateAdded || new Date(0)) >= fromDate
    );
  }
  if (filter.dateTo) {
    const toDate = typeof filter.dateTo === 'string' ? new Date(filter.dateTo) : filter.dateTo;
    filtered = filtered.filter(
      (doc) => (doc.metadata.dateAdded || new Date()) <= toDate
    );
  }

  // File type filter
  if (filter.fileTypes && filter.fileTypes.length > 0) {
    filtered = filtered.filter((doc) =>
      filter.fileTypes!.includes(doc.metadata.fileType || 'unknown')
    );
  }

  // Favorite filter
  if (filter.isFavorite) {
    filtered = filtered.filter((doc) => doc.isFavorite === true);
  }

  return filtered;
}

/**
 * Apply sorting to documents
 */
function applySorting(documents: Document[], sort: DocumentSort): Document[] {
  const sorted = [...documents];
  const { field, direction } = sort;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'title':
        comparison = a.metadata.title.localeCompare(b.metadata.title);
        break;
      case 'author':
        const aAuthor = a.metadata.author || '';
        const bAuthor = b.metadata.author || '';
        comparison = aAuthor.localeCompare(bAuthor);
        break;
      case 'dateAdded':
        const aDateAdded = a.metadata.dateAdded?.getTime() || 0;
        const bDateAdded = b.metadata.dateAdded?.getTime() || 0;
        comparison = aDateAdded - bDateAdded;
        break;
      case 'dateModified':
        const aDateModified = a.metadata.dateModified?.getTime() || 0;
        const bDateModified = b.metadata.dateModified?.getTime() || 0;
        comparison = aDateModified - bDateModified;
        break;
      case 'fileName':
        comparison = a.fileName.localeCompare(b.fileName);
        break;
      case 'fileSize':
        comparison = a.fileSize - b.fileSize;
        break;
      case 'rating':
        const aRating = a.metadata.rating || 0;
        const bRating = b.metadata.rating || 0;
        comparison = aRating - bRating;
        break;
    }

    return comparison * multiplier;
  });

  return sorted;
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(
  id: string,
  metadataUpdates: Partial<Document['metadata']>
): Promise<Document | null> {
  const doc = await getDocumentById(id);
  if (!doc) {
    return null;
  }

  // Update metadata
  const updatedMetadata = {
    ...doc.metadata,
    ...metadataUpdates,
    dateModified: new Date(),
  };

  // Write to markdown file (source of truth)
  const mdPath = getCompanionMarkdownPath(doc.filePath);
  await writeMarkdownFile(mdPath, updatedMetadata, doc.metadata.notes || '');

  // Update document in cache
  const updatedDoc: Document = {
    ...doc,
    metadata: updatedMetadata,
    updatedAt: new Date(),
  };

  // Update cache
  await refreshDocumentCache();

  // Sync to SQLite (fire and forget)
  try {
    const { syncDocument } = require('./sync-service');
    syncDocument(updatedDoc);
  } catch (error) {
    // Log but don't fail - filesystem is source of truth
    console.warn('Failed to sync to SQLite:', error);
  }

  return updatedDoc;
}

/**
 * Refresh the document cache
 */
export async function refreshDocumentCache(): Promise<void> {
  const settings = await loadSettings();

  for (const library of settings.libraries) {
    const result = await scanDirectoryForDocuments(library.path);
    documentCache.set(library.id, result.documents);
  }
}

/**
 * Clear the document cache
 */
export function clearDocumentCache(): void {
  documentCache.clear();
}

/**
 * Invalidate cache for a specific library
 */
export function invalidateLibraryCache(libraryId: string): void {
  documentCache.delete(libraryId);
}

/**
 * Get unique categories from all documents
 */
export async function getCategories(): Promise<string[]> {
  const documents = await getAllDocuments();
  const categories = new Set<string>();

  for (const doc of documents) {
    if (doc.metadata.category) {
      categories.add(doc.metadata.category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Get unique tags from all documents
 */
export async function getTags(): Promise<string[]> {
  const documents = await getAllDocuments();
  const tags = new Set<string>();

  for (const doc of documents) {
    for (const tag of doc.metadata.tags) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}

/**
 * Get unique authors from all documents
 */
export async function getAuthors(): Promise<string[]> {
  const documents = await getAllDocuments();
  const authors = new Set<string>();

  for (const doc of documents) {
    if (doc.metadata.author) {
      authors.add(doc.metadata.author);
    }
  }

  return Array.from(authors).sort();
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  total: number;
  byReadStatus: Record<ReadStatus, number>;
  byCategory: Record<string, number>;
  totalSize: number;
}> {
  const documents = await getAllDocuments();

  const byReadStatus: Record<ReadStatus, number> = {
    unread: 0,
    reading: 0,
    read: 0,
  };
  const byCategory: Record<string, number> = {};
  let totalSize = 0;

  for (const doc of documents) {
    const status = doc.metadata.readStatus || 'unread';
    byReadStatus[status]++;

    if (doc.metadata.category) {
      byCategory[doc.metadata.category] = (byCategory[doc.metadata.category] || 0) + 1;
    }

    totalSize += doc.fileSize;
  }

  return {
    total: documents.length,
    byReadStatus,
    byCategory,
    totalSize,
  };
}

/**
 * Delete a document (both PDF and metadata file)
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const doc = await getDocumentById(id);
  if (!doc) {
    return false;
  }

  try {
    // Delete PDF file
    await fs.unlink(doc.filePath);

    // Delete metadata file if it exists
    const mdPath = getCompanionMarkdownPath(doc.filePath);
    try {
      await fs.unlink(mdPath);
    } catch {
      // Metadata file doesn't exist, that's fine
    }

    // Refresh cache
    await refreshDocumentCache();

    // Sync to SQLite (fire and forget)
    try {
      const { removeDocumentFromDb } = require('./sync-service');
      removeDocumentFromDb(id);
    } catch (error) {
      // Log but don't fail - filesystem is source of truth
      console.warn('Failed to remove from SQLite:', error);
    }

    return true;
  } catch {
    return false;
  }
}
