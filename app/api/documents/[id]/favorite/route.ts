import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocumentMetadata } from '@/services/document-service';

/**
 * POST /api/documents/[id]/favorite
 * Toggle favorite status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Toggle favorite status by storing in custom fields
    const currentFavorite = document.metadata.customFields?.isFavorite === true;
    const updatedMetadata = {
      ...document.metadata,
      customFields: {
        ...(document.metadata.customFields || {}),
        isFavorite: !currentFavorite,
      },
    };

    const updated = await updateDocumentMetadata(id, updatedMetadata);

    return NextResponse.json({
      isFavorite: !currentFavorite,
      document: updated,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    );
  }
}
