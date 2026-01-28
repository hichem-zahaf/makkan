import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { importSinglePdf } from '@/services/import-service';
import { loadSettings } from '@/services/settings-service';
import { sanitizeFileName } from '@/lib/utils';

/**
 * POST /api/files/upload
 * Upload a PDF file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const libraryId = formData.get('libraryId') as string;
    const category = formData.get('category') as string | null;
    const tags = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Get library path
    const settings = await loadSettings();
    const library = settings.libraries.find((lib) => lib.id === libraryId);

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    // Sanitize filename
    const sanitizedName = sanitizeFileName(file.name);

    // Build target path
    let targetDirectory = library.path;
    if (category) {
      targetDirectory = path.join(library.path, sanitizeFileName(category));
      // Ensure directory exists
      await fs.mkdir(targetDirectory, { recursive: true });
    }

    const targetPath = path.join(targetDirectory, sanitizedName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(targetPath, buffer);

    // Import the file with metadata
    const document = await importSinglePdf(targetPath, {
      category: category || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/upload
 * Get upload options (libraries, categories)
 */
export async function GET() {
  try {
    const settings = await loadSettings();

    // Get unique categories from existing documents
    const { getFilteredDocuments } = require('@/services/document-service');
    const documents = await getFilteredDocuments();
    const categories = new Set<string>();
    for (const doc of documents) {
      if (doc.metadata.category) {
        categories.add(doc.metadata.category);
      }
    }

    return NextResponse.json({
      libraries: settings.libraries,
      categories: Array.from(categories),
    });
  } catch (error) {
    console.error('Error getting upload options:', error);
    return NextResponse.json(
      { error: 'Failed to get upload options' },
      { status: 500 }
    );
  }
}
