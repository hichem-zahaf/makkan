import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/services/document-service';
import { streamPdfFile } from '@/lib/fs/pdf-stream';

/**
 * GET /api/files/[id]/pdf
 * Stream a PDF file
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

    // Stream the PDF file
    await streamPdfFile(document.filePath, {
      setHeader: (name, value) => {
        // Headers will be set by NextResponse
      },
      send: (stream) => {
        // Create a streaming response
        return new NextResponse(stream as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Accept-Ranges': 'bytes',
            'Content-Disposition': `inline; filename="${document.fileName}"`,
          },
        });
      },
      status: (code) => ({
        send: (body) => new NextResponse(body, { status: code }),
      }),
    });

    // Create actual streaming response
    const { createReadStream } = require('fs');
    const stream = createReadStream(document.filePath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error streaming PDF:', error);
    return NextResponse.json(
      { error: 'Failed to stream PDF' },
      { status: 500 }
    );
  }
}
