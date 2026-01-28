import { NextRequest, NextResponse } from 'next/server';
import {
  getDocuments,
  getDocumentCount,
  searchDocuments as sqliteSearch,
  isDatabasePopulated,
  getStats,
  getCategories,
  getTags,
  getAuthors,
} from '@/services/query-service';
import {
  getAllDocuments,
  getFilteredDocuments,
  refreshDocumentCache,
} from '@/services/document-service';

/**
 * GET /api/documents
 * Get all documents with optional filtering and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSearch = searchParams.get('search');

    // Parse filters
    const filter = {
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      author: searchParams.get('author') || undefined,
      readStatus: (searchParams.get('readStatus') as 'unread' | 'reading' | 'read') || undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      isFavorite: searchParams.get('isFavorite') === 'true' ? true : undefined,
    };

    // Parse sorting
    const sortField = searchParams.get('sortField') as 'title' | 'author' | 'dateAdded' | 'fileName' | 'rating' | undefined;
    const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' | undefined;

    const sort = sortField && sortDirection ? {
      field: sortField,
      direction: sortDirection,
    } : undefined;

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let documents: any[] = [];
    let total = 0;

    // Use SQLite if database is populated, otherwise fallback to filesystem
    const dbPopulated = isDatabasePopulated();

    if (useSearch) {
      // Use SQLite FTS5 search
      if (dbPopulated) {
        documents = sqliteSearch(useSearch, limit, offset);
        total = documents.length; // FTS doesn't return total count directly
      } else {
        // Fallback to filesystem search
        const searchFilter = { ...filter, search: useSearch };
        documents = await getFilteredDocuments(searchFilter, sort);
        total = documents.length;
        documents = documents.slice(offset, offset + limit);
      }
    } else {
      // Standard filtered query
      if (dbPopulated) {
        documents = getDocuments(filter, sort, limit, offset);
        total = getDocumentCount(filter);
      } else {
        // Fallback to filesystem
        documents = await getFilteredDocuments(filter, sort);
        total = documents.length;
        documents = documents.slice(offset, offset + limit);
      }
    }

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      dbPopulated,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Trigger a document scan/refresh or get stats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'refresh') {
      await refreshDocumentCache();
      return NextResponse.json({ success: true, message: 'Document cache refreshed' });
    }

    if (action === 'stats') {
      // Use SQLite stats if available
      if (isDatabasePopulated()) {
        const stats = getStats();
        return NextResponse.json({
          total: stats.total,
          byReadStatus: stats.byReadStatus,
          byCategory: stats.byCategory,
          totalSize: stats.totalSize,
          favoriteCount: stats.favoriteCount,
        });
      } else {
        // Fallback to filesystem stats
        const { getDocumentStats } = require('@/services/document-service');
        const stats = await getDocumentStats();
        return NextResponse.json(stats);
      }
    }

    if (action === 'categories') {
      const categories = isDatabasePopulated() ? getCategories() : await (await import('@/services/document-service')).getCategories();
      return NextResponse.json({ categories });
    }

    if (action === 'tags') {
      const tags = isDatabasePopulated() ? getTags() : await (await import('@/services/document-service')).getTags();
      return NextResponse.json({ tags });
    }

    if (action === 'authors') {
      const authors = isDatabasePopulated() ? getAuthors() : await (await import('@/services/document-service')).getAuthors();
      return NextResponse.json({ authors });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
