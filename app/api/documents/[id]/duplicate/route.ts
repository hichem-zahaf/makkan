import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/services/document-service';
import { promises as fs } from 'fs';
import path from 'path';
import { generateDocumentId } from '@/lib/utils';
import { createDefaultMetadata, writeMarkdownFile, getCompanionMarkdownPath } from '@/lib/fs';

/**
 * POST /api/documents/[id]/duplicate
 * Duplicate a document
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

    const body = await request.json().catch(() => ({}));
    const { newTitle } = body as { newTitle?: string };

    // Generate new file paths
    const originalDir = path.dirname(document.filePath);
    const originalExt = path.extname(document.fileName);
    const baseName = path.basename(document.fileName, originalExt);

    const newFileName = `${newTitle || `${baseName} (copy)`}${originalExt}`;
    const newFilePath = path.join(originalDir, newFileName);

    // Copy the PDF file
    await fs.copyFile(document.filePath, newFilePath);

    // Get file stats for the new file
    const fileStats = await fs.stat(newFilePath);

    // Create new metadata
    const newMetadata = {
      ...document.metadata,
      title: newTitle || `${document.metadata.title} (Copy)`,
      dateAdded: new Date(),
      dateModified: new Date(),
    };

    // Write the markdown file
    const mdPath = getCompanionMarkdownPath(newFilePath);
    await writeMarkdownFile(mdPath, newMetadata, '');

    // Return info about the duplicated document
    // Note: The document will need to be scanned to appear in the database
    return NextResponse.json({
      success: true,
      filePath: newFilePath,
      fileName: newFileName,
      metadata: newMetadata,
      message: 'Document duplicated successfully. Refresh your library to see it.',
    });
  } catch (error) {
    console.error('Error duplicating document:', error);
    return NextResponse.json(
      {
        error: 'Failed to duplicate document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
