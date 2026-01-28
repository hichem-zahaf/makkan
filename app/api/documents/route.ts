import { NextRequest, NextResponse } from 'next/server';
import {
  getAllDocuments,
  getFilteredDocuments,
  refreshDocumentCache,
  getDocumentStats,
  getCategories,
  getTags,
  getAuthors,
} from '@/services/document-service';

/**
 * GET /api/documents
 * Get all documents with optional filtering and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filter = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      author: searchParams.get('author') || undefined,
      readStatus: (searchParams.get('readStatus') as 'unread' | 'reading' | 'read') || undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
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

    // Get filtered and sorted documents
    let documents = await getFilteredDocuments(filter, sort);

    // Get total count before pagination
    const total = documents.length;

    // Apply pagination
    documents = documents.slice(offset, offset + limit);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Trigger a document scan/refresh
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
      const stats = await getDocumentStats();
      return NextResponse.json(stats);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
