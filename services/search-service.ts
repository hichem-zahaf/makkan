import Fuse from 'fuse.js';
import type { FuseResult } from 'fuse.js';
import type { Document } from '../lib/types';
import { getAllDocuments } from './document-service';

/**
 * Search result with score
 */
export interface SearchResult extends Document {
  score?: number;
  matches?: FuseResult<Document>['matches'];
}

/**
 * Search options
 */
export interface SearchOptions {
  threshold?: number; // 0.0 - 1.0, lower is more strict
  limit?: number;
  includeScore?: boolean;
  keys?: Array<{
    name: string;
    weight?: number;
  }>;
}

/**
 * Default search keys with weights
 */
const DEFAULT_SEARCH_KEYS = [
  { name: 'metadata.title', weight: 3 },
  { name: 'metadata.author', weight: 2 },
  { name: 'metadata.tags', weight: 2 },
  { name: 'metadata.category', weight: 1.5 },
  { name: 'metadata.notes', weight: 1 },
  { name: 'metadata.customFields', weight: 0.5 },
  { name: 'fileName', weight: 1 },
];

/**
 * Default search options
 */
const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  threshold: 0.3,
  limit: 50,
  includeScore: true,
  keys: DEFAULT_SEARCH_KEYS,
};

/**
 * Build a Fuse.js index from documents
 */
export async function buildSearchIndex(): Promise<Fuse<Document>> {
  const documents = await getAllDocuments();

  return new Fuse(documents, {
    keys: DEFAULT_SEARCH_KEYS,
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    useExtendedSearch: true,
  });
}

/**
 * Search documents using fuzzy search
 */
export async function searchDocuments(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const documents = await getAllDocuments();

  if (!query.trim()) {
    return documents.slice(0, opts.limit || 50);
  }

  const fuse = new Fuse(documents, {
    keys: opts.keys || DEFAULT_SEARCH_KEYS,
    threshold: opts.threshold || 0.3,
    includeScore: opts.includeScore,
    includeMatches: true,
  });

  const results = fuse.search(query, { limit: opts.limit || 50 });

  return results.map((result) => ({
    ...result.item,
    score: result.score,
    matches: result.matches,
  }));
}

/**
 * Search documents in a specific category
 */
export async function searchInCategory(
  category: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const allResults = await searchDocuments(query, options);
  return allResults.filter((doc) => doc.metadata.category === category);
}

/**
 * Search documents with specific tags
 */
export async function searchWithTags(
  tags: string[],
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const allResults = await searchDocuments(query, options);
  return allResults.filter((doc) =>
    tags.every((tag) => doc.metadata.tags.includes(tag))
  );
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const documents = await getAllDocuments();

  if (!query.trim()) {
    return [];
  }

  // Collect all searchable text
  const allText = new Set<string>();
  for (const doc of documents) {
    allText.add(doc.metadata.title);
    if (doc.metadata.author) {
      allText.add(doc.metadata.author);
    }
    doc.metadata.tags.forEach((tag) => allText.add(tag));
    if (doc.metadata.category) {
      allText.add(doc.metadata.category);
    }
  }

  // Create a Fuse index for suggestions
  const fuse = new Fuse(Array.from(allText), {
    threshold: 0.3,
    distance: 100,
  });

  const results = fuse.search(query, { limit });
  return results.map((result) => result.item);
}

/**
 * Get related documents based on tags and category
 */
export async function getRelatedDocuments(
  documentId: string,
  limit: number = 5
): Promise<Document[]> {
  const documents = await getAllDocuments();
  const targetDoc = documents.find((doc) => doc.id === documentId);

  if (!targetDoc) {
    return [];
  }

  // Score documents based on shared attributes
  const scored = documents
    .filter((doc) => doc.id !== documentId)
    .map((doc) => {
      let score = 0;

      // Same category
      if (
        targetDoc.metadata.category &&
        doc.metadata.category === targetDoc.metadata.category
      ) {
        score += 3;
      }

      // Shared tags
      const sharedTags = doc.metadata.tags.filter((tag) =>
        targetDoc.metadata.tags.includes(tag)
      );
      score += sharedTags.length * 2;

      // Same author
      if (
        targetDoc.metadata.author &&
        doc.metadata.author === targetDoc.metadata.author
      ) {
        score += 2;
      }

      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.doc);

  return scored;
}

/**
 * Advanced search with filters
 */
export async function advancedSearch(options: {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  readStatus?: 'unread' | 'reading' | 'read';
  rating?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}): Promise<SearchResult[]> {
  let documents = await getAllDocuments();

  // Apply text search first if query is provided
  if (options.query) {
    const searchResults = await searchDocuments(options.query, {
      limit: documents.length,
    });
    documents = searchResults;
  }

  // Apply filters
  if (options.category) {
    documents = documents.filter(
      (doc) => doc.metadata.category === options.category
    );
  }

  if (options.tags && options.tags.length > 0) {
    documents = documents.filter((doc) =>
      options.tags!.every((tag) => doc.metadata.tags.includes(tag))
    );
  }

  if (options.author) {
    documents = documents.filter(
      (doc) => doc.metadata.author === options.author
    );
  }

  if (options.readStatus) {
    documents = documents.filter(
      (doc) => doc.metadata.readStatus === options.readStatus
    );
  }

  if (options.rating) {
    documents = documents.filter(
      (doc) => (doc.metadata.rating || 0) >= options.rating!
    );
  }

  if (options.dateFrom) {
    documents = documents.filter(
      (doc) => (doc.metadata.dateAdded || new Date(0)) >= options.dateFrom!
    );
  }

  if (options.dateTo) {
    documents = documents.filter(
      (doc) => (doc.metadata.dateAdded || new Date()) <= options.dateTo!
    );
  }

  // Apply limit
  if (options.limit) {
    documents = documents.slice(0, options.limit);
  }

  return documents;
}
