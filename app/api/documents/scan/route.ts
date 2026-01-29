import { NextRequest, NextResponse } from 'next/server';
import { scanDirectoryForDocuments } from '@/lib/fs/document-scanner';
import { loadSettings } from '@/services/settings-service';
import { refreshDocumentCache } from '@/services/document-service';
import { syncLibrary } from '@/services/sync-service';

/**
 * POST /api/documents/scan
 * Trigger a directory scan for new documents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const libraryId = body.libraryId;

    if (!libraryId) {
      return NextResponse.json(
        { error: 'libraryId is required' },
        { status: 400 }
      );
    }

    const settings = await loadSettings();
    const library = settings.libraries.find((lib) => lib.id === libraryId);

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    // Scan the directory
    const result = await scanDirectoryForDocuments(library.path, {
      recursive: true,
      includeOrphans: true,
    });

    // Refresh the document cache
    await refreshDocumentCache();

    // Sync the library to database (adds new documents, updates existing ones)
    const syncResult = await syncLibrary(libraryId);

    return NextResponse.json({
      success: true,
      stats: result.stats,
      errors: result.errors,
      documentsFound: result.documents.length,
      synced: {
        added: syncResult.added,
        updated: syncResult.updated,
        errors: syncResult.errors,
      },
    });
  } catch (error) {
    console.error('Error scanning directory:', error);
    return NextResponse.json(
      { error: 'Failed to scan directory' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/scan
 * Get scan status/options
 */
export async function GET() {
  try {
    const settings = await loadSettings();

    return NextResponse.json({
      libraries: settings.libraries.map((lib) => ({
        id: lib.id,
        name: lib.name,
        path: lib.path,
        organization: lib.organization,
      })),
    });
  } catch (error) {
    console.error('Error getting scan status:', error);
    return NextResponse.json(
      { error: 'Failed to get scan status' },
      { status: 500 }
    );
  }
}
