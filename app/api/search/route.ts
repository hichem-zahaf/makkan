import { NextRequest, NextResponse } from 'next/server';
import {
  searchDocuments,
  getSearchSuggestions,
  getRelatedDocuments,
  advancedSearch,
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
      const suggestions = await getSearchSuggestions(query, limit);
      return NextResponse.json({ suggestions });
    }

    if (type === 'related') {
      const documentId = searchParams.get('documentId');
      if (!documentId) {
        return NextResponse.json(
          { error: 'documentId is required for related search' },
          { status: 400 }
        );
      }
      const related = await getRelatedDocuments(documentId, limit);
      return NextResponse.json({ documents: related });
    }

    if (type === 'advanced') {
      const category = searchParams.get('category') || undefined;
      const tags = searchParams.get('tags')?.split(',') || undefined;
      const author = searchParams.get('author') || undefined;
      const readStatus = (searchParams.get('readStatus') as 'unread' | 'reading' | 'read') || undefined;
      const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined;
      const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
      const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

      const results = await advancedSearch({
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

    // Basic search (default)
    const threshold = parseFloat(searchParams.get('threshold') || '0.3');
    const results = await searchDocuments(query, {
      threshold,
      limit,
      includeScore: true,
    });

    return NextResponse.json({
      documents: results,
      total: results.length,
      query,
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    );
  }
}
