import { NextRequest, NextResponse } from 'next/server';
import {
  searchDocuments as sqliteSearch,
  getSearchSuggestions,
  getSimilarDocuments,
  getTags,
  getAuthors,
  getCategories,
  isDatabasePopulated,
} from '@/services/query-service';
import {
  searchDocuments as fuseSearch,
  getSearchSuggestions as fuseSuggestions,
  getRelatedDocuments,
  advancedSearch as fuseAdvancedSearch,
} from '@/services/search-service';

/**
 * GET /api/search
 * Search documents
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'basic';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (type === 'suggestions') {
      // Use SQLite for suggestions if available
      if (isDatabasePopulated()) {
        const suggestions = getSearchSuggestions(query, limit);
        return NextResponse.json({ suggestions });
      } else {
        const suggestions = await fuseSuggestions(query, limit);
        return NextResponse.json({ suggestions });
      }
    }

    if (type === 'related') {
      const documentId = searchParams.get('documentId');
      if (!documentId) {
        return NextResponse.json(
          { error: 'documentId is required for related search' },
          { status: 400 }
        );
      }

      // Use SQLite for related documents if available
      if (isDatabasePopulated()) {
        const related = getSimilarDocuments(documentId, limit);
        return NextResponse.json({ documents: related });
      } else {
        const related = await getRelatedDocuments(documentId, limit);
        return NextResponse.json({ documents: related });
      }
    }

    if (type === 'advanced') {
      const category = searchParams.get('category') || undefined;
      const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
      const author = searchParams.get('author') || undefined;
      const readStatus = (searchParams.get('readStatus') as 'unread' | 'reading' | 'read') || undefined;
      const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined;
      const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
      const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

      // Use SQLite for advanced search if available
      if (isDatabasePopulated()) {
        const { getDocuments } = require('@/services/query-service');
        const filter: any = {};
        if (category) filter.category = category;
        if (tags) filter.tags = tags;
        if (author) filter.author = author;
        if (readStatus) filter.readStatus = readStatus;
        if (rating) filter.rating = rating;
        if (dateFrom) filter.dateFrom = dateFrom;
        if (dateTo) filter.dateTo = dateTo;

        // If query is provided, combine with text search
        let results: any[] = [];
        if (query && query.trim()) {
          // Use FTS5 search
          results = sqliteSearch(query, limit);
          // Apply additional filters client-side (or we could enhance FTS to support this)
          results = results.filter((doc: any) => {
            if (category && doc.metadata.category !== category) return false;
            if (tags && tags.length > 0 && !tags.every((t: string) => doc.metadata.tags.includes(t))) return false;
            if (author && doc.metadata.author !== author) return false;
            if (readStatus && doc.metadata.readStatus !== readStatus) return false;
            if (rating && (doc.metadata.rating || 0) < rating) return false;
            return true;
          });
        } else {
          // Just filter
          results = getDocuments(filter, { field: 'dateAdded', direction: 'desc' }, limit);
        }

        return NextResponse.json({
          documents: results,
          total: results.length,
        });
      } else {
        // Fallback to Fuse.js
        const results = await fuseAdvancedSearch({
          query: query || undefined,
          category,
          tags,
          author,
          readStatus,
          rating,
          dateFrom,
          dateTo,
          limit,
        });

        return NextResponse.json({
          documents: results,
          total: results.length,
        });
      }
    }

    // Basic search (default) - Use SQLite FTS5 if available
    if (isDatabasePopulated()) {
      const results = sqliteSearch(query, limit);
      return NextResponse.json({
        documents: results,
        total: results.length,
        query,
        searchType: 'fts5',
      });
    } else {
      // Fallback to Fuse.js fuzzy search
      const threshold = parseFloat(searchParams.get('threshold') || '0.3');
      const results = await fuseSearch(query, {
        threshold,
        limit,
        includeScore: true,
      });

      return NextResponse.json({
        documents: results,
        total: results.length,
        query,
        searchType: 'fusejs',
      });
    }
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: 'Failed to search documents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
