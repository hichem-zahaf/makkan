import { NextRequest, NextResponse } from 'next/server';
import { getDocumentCountByLibraryPath } from '@/lib/db/database';

/**
 * GET /api/settings/libraries/count?path=...
 * Get document count for a library path
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const count = getDocumentCountByLibraryPath(path);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error getting document count:', error);
    return NextResponse.json(
      { error: 'Failed to get document count', count: 0 },
      { status: 500 }
    );
  }
}
