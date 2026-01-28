import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocumentMetadata } from '@/services/document-service';
import { readMarkdownFile, writeMarkdownFile, getCompanionMarkdownPath } from '@/lib/fs';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET /api/documents/[id]/metadata
 * Get document metadata with markdown content
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
      { error: 'Failed to fetch metadata', details: error instanceof Error ? error.message : 'Unknown error' },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { metadata, content } = body;

    if (!metadata) {
      return NextResponse.json(
        { error: 'metadata is required' },
        { status: 400 }
      );
    }

    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Write the updated metadata and content
    const mdPath = getCompanionMarkdownPath(document.filePath);

    // Ensure the directory exists before writing
    const directory = path.dirname(mdPath);
    try {
      await fs.access(directory);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(directory, { recursive: true });
    }

    await writeMarkdownFile(mdPath, metadata, content || '');

    // Update document metadata
    const updated = await updateDocumentMetadata(id, metadata);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating document metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to update metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
