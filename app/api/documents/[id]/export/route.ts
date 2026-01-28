import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/services/document-service';
import { serializeMarkdown } from '@/lib/fs/metadata-parser';
import type { DocumentMetadata } from '@/lib/types';

/**
 * GET /api/documents/[id]/export
 * Export document metadata
 */
export async function GET(
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

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    if (format === 'markdown') {
      // Export as markdown file
      const markdown = serializeMarkdown(document.metadata, '');
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${document.metadata.title || document.fileName}.md"`,
        },
      });
    }

    // Default: Export as JSON
    return NextResponse.json({
      title: document.metadata.title,
      fileName: document.fileName,
      author: document.metadata.author,
      category: document.metadata.category,
      tags: document.metadata.tags,
      readStatus: document.metadata.readStatus,
      rating: document.metadata.rating,
      source: document.metadata.source,
      notes: document.metadata.notes,
      dateAdded: document.metadata.dateAdded,
      dateModified: document.metadata.dateModified,
      customFields: document.metadata.customFields,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error('Error exporting document:', error);
    return NextResponse.json(
      { error: 'Failed to export document' },
      { status: 500 }
    );
  }
}
