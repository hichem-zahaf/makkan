import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocumentMetadata } from '@/services/document-service';
import { readMarkdownFile, writeMarkdownFile, getCompanionMarkdownPath } from '@/lib/fs';

/**
 * GET /api/documents/[id]/metadata
 * Get document metadata with markdown content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocumentById(params.id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Read the markdown file to get full content
    const mdPath = getCompanionMarkdownPath(document.filePath);
    const markdown = await readMarkdownFile(mdPath);

    return NextResponse.json({
      metadata: document.metadata,
      content: markdown.content,
      filePath: mdPath,
    });
  } catch (error) {
    console.error('Error fetching document metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/documents/[id]/metadata
 * Update document metadata with markdown content
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { metadata, content } = body;

    if (!metadata) {
      return NextResponse.json(
        { error: 'metadata is required' },
        { status: 400 }
      );
    }

    const document = await getDocumentById(params.id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Write the updated metadata and content
    const mdPath = getCompanionMarkdownPath(document.filePath);
    await writeMarkdownFile(mdPath, metadata, content || '');

    // Update document metadata
    const updated = await updateDocumentMetadata(params.id, metadata);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating document metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata' },
      { status: 500 }
    );
  }
}
