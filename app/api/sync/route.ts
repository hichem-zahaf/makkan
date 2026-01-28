import { NextRequest, NextResponse } from 'next/server';
import { syncAllDocuments, quickSync } from '@/services/sync-service';

/**
 * POST /api/sync
 * Trigger a sync of all documents from filesystem to SQLite
 * Query params:
 *   - quick: if true, only update modified documents (faster)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quick = searchParams.get('quick') === 'true';

    const result = quick ? await quickSync() : await syncAllDocuments();

    return NextResponse.json({
      success: true,
      ...result,
      message: quick
        ? `Quick sync complete: ${result.added} added, ${result.updated} updated`
        : `Full sync complete: ${result.added} added, ${result.updated} updated, ${result.removed} removed`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync
 * Get sync status
 */
export async function GET() {
  try {
    const { getDatabaseStats, isDatabasePopulated } = require('@/lib/db/database');

    const stats = getDatabaseStats();
    const populated = isDatabasePopulated();

    return NextResponse.json({
      populated,
      stats: {
        documents: stats.documentCount,
        authors: stats.authorCount,
        categories: stats.categoryCount,
        tags: stats.tagCount,
        libraries: stats.libraryCount,
        dbSize: stats.dbSize,
      },
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
