import { NextRequest, NextResponse } from 'next/server';
import { updateLibrary, removeLibrary, getLibraries } from '@/services/settings-service';
import { getDirectorySize } from '@/lib/fs/directory-utils';
import { getDocumentCountByLibraryPath, deleteDocumentsByLibraryPath } from '@/lib/db/database';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET /api/settings/libraries/[id]
 * Get a specific library with size information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const libraries = await getLibraries();
    const library = libraries.find((lib: any) => lib.id === id);

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    // Calculate library size
    let size = 0;
    try {
      const stat = await fs.stat(library.path);
      if (stat.isDirectory()) {
        size = await getDirectorySize(library.path);
      } else {
        size = stat.size;
      }
    } catch (error) {
      // Path doesn't exist or is inaccessible
      size = 0;
    }

    return NextResponse.json({
      ...library,
      size,
    });
  } catch (error) {
    console.error('Error getting library:', error);
    return NextResponse.json(
      { error: 'Failed to get library' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/libraries/[id]
 * Update a specific library
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateLibrary(id, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating library:', error);
    return NextResponse.json(
      { error: 'Failed to update library' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/libraries/[id]
 * Delete a specific library and cascade delete associated documents
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const libraries = await getLibraries();
    const library = libraries.find((lib: any) => lib.id === id);

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    // Get document count before deleting
    const docCount = getDocumentCountByLibraryPath(library.path);

    // Cascade delete documents
    const deletedDocs = deleteDocumentsByLibraryPath(library.path);

    // Remove library
    const success = await removeLibrary(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete library' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedDocuments: deletedDocs,
      totalDocuments: docCount
    });
  } catch (error) {
    console.error('Error deleting library:', error);
    return NextResponse.json(
      { error: 'Failed to delete library' },
      { status: 500 }
    );
  }
}
