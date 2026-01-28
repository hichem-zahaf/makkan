import { promises as fs } from 'fs';
import path from 'path';
import type { Document } from '../lib/types';
import {
  scanDirectoryForDocuments,
  writeMarkdownFile,
  createDefaultMetadata,
  getCompanionMarkdownPath,
} from '../lib/fs';
import { getFileNameWithoutExtension, sanitizeFileName } from '../lib/utils';

/**
 * Import progress callback
 */
export type ImportProgressCallback = (progress: ImportProgress) => void;

/**
 * Import progress information
 */
export interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentFile?: string;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Import options
 */
export interface ImportOptions {
  createMetadata?: boolean; // Create .md files for PDFs without them
  category?: string; // Default category for imported documents
  tags?: string[]; // Default tags for imported documents
  moveFiles?: boolean; // Move files to a new location
  targetDirectory?: string; // Target directory if moving files
  onProgress?: ImportProgressCallback;
}

/**
 * Import result
 */
export interface ImportResult {
  documents: Document[];
  errors: Array<{ path: string; error: string }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Import documents from a directory
 */
export async function importDocuments(
  directoryPath: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    createMetadata = true,
    category,
    tags = [],
    onProgress,
  } = options;

  // Scan directory for documents
  const scanResult = await scanDirectoryForDocuments(directoryPath, {
    recursive: true,
  });

  const documents: Document[] = [];
  const errors = [...scanResult.errors];
  const progress: ImportProgress = {
    total: scanResult.documents.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Process each document
  for (const doc of scanResult.documents) {
    progress.currentFile = doc.fileName;
    progress.processed++;

    try {
      // Check if document has metadata
      const hasMetadata =
        doc.metadata.author ||
        doc.metadata.category ||
        doc.metadata.tags.length > 0 ||
        doc.metadata.notes;

      // Create metadata if requested and document doesn't have any
      if (createMetadata && !hasMetadata) {
        const metadata = createDefaultMetadata(doc.fileName, category);
        if (category) {
          metadata.category = category;
        }
        if (tags.length > 0) {
          metadata.tags = [...tags];
        }

        const mdPath = getCompanionMarkdownPath(doc.filePath);
        await writeMarkdownFile(mdPath, metadata, '');

        // Update document with new metadata
        doc.metadata = metadata;
      }

      documents.push(doc);
      progress.succeeded++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push({ path: doc.filePath, error: errorMessage });
      progress.failed++;
      progress.errors.push({ path: doc.filePath, error: errorMessage });
    }

    // Report progress
    if (onProgress) {
      onProgress({ ...progress });
    }
  }

  return {
    documents,
    errors,
    stats: {
      total: scanResult.documents.length,
      succeeded: progress.succeeded,
      failed: progress.failed,
    },
  };
}

/**
 * Import a single PDF file
 */
export async function importSinglePdf(
  pdfPath: string,
  metadata?: {
    title?: string;
    author?: string;
    category?: string;
    tags?: string[];
    notes?: string;
  }
): Promise<Document> {
  const fileName = path.basename(pdfPath);
  const stats = await fs.stat(pdfPath);

  // Create or use provided metadata
  const defaultMetadata = createDefaultMetadata(fileName, metadata?.category);

  const documentMetadata = {
    ...defaultMetadata,
    ...metadata,
    tags: metadata?.tags || [],
  };

  // Write metadata file
  const mdPath = getCompanionMarkdownPath(pdfPath);
  await writeMarkdownFile(mdPath, documentMetadata, metadata?.notes || '');

  return {
    id: Buffer.from(pdfPath).toString('base64'),
    filePath: pdfPath,
    fileName,
    fileSize: stats.size,
    metadata: documentMetadata,
    createdAt: stats.birthtime,
    updatedAt: new Date(),
  };
}

/**
 * Batch import PDFs from multiple directories
 */
export async function batchImport(
  directories: string[],
  options: ImportOptions = {}
): Promise<Map<string, ImportResult>> {
  const results = new Map<string, ImportResult>();

  for (const directory of directories) {
    try {
      const result = await importDocuments(directory, options);
      results.set(directory, result);
    } catch (error) {
      results.set(directory, {
        documents: [],
        errors: [
          {
            path: directory,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        stats: { total: 0, succeeded: 0, failed: 0 },
      });
    }
  }

  return results;
}

/**
 * Find orphan PDFs (PDFs without companion metadata files)
 */
export async function findOrphanPdfs(
  directoryPath: string
): Promise<string[]> {
  const scanResult = await scanDirectoryForDocuments(directoryPath, {
    recursive: true,
  });

  return scanResult.documents
    .filter((doc) => {
      // Check if document has meaningful metadata
      const hasMeaningfulMetadata =
        doc.metadata.title !== getFileNameWithoutExtension(doc.fileName) ||
        doc.metadata.author ||
        doc.metadata.category ||
        doc.metadata.tags.length > 0 ||
        doc.metadata.notes;

      return !hasMeaningfulMetadata;
    })
    .map((doc) => doc.filePath);
}

/**
 * Create metadata for orphan PDFs in bulk
 */
export async function createMetadataForOrphans(
  directoryPath: string,
  options: {
    category?: string;
    tags?: string[];
    onProgress?: ImportProgressCallback;
  } = {}
): Promise<ImportResult> {
  const orphans = await findOrphanPdfs(directoryPath);

  const documents: Document[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  const progress: ImportProgress = {
    total: orphans.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const pdfPath of orphans) {
    progress.currentFile = path.basename(pdfPath);
    progress.processed++;

    try {
      const doc = await importSinglePdf(pdfPath, {
        category: options.category,
        tags: options.tags,
      });
      documents.push(doc);
      progress.succeeded++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push({ path: pdfPath, error: errorMessage });
      progress.failed++;
      progress.errors.push({ path: pdfPath, error: errorMessage });
    }

    if (options.onProgress) {
      options.onProgress({ ...progress });
    }
  }

  return {
    documents,
    errors,
    stats: {
      total: orphans.length,
      succeeded: progress.succeeded,
      failed: progress.failed,
    },
  };
}

/**
 * Organize files into categories by moving them
 * Note: This is disabled by default as per user requirements (metadata only)
 */
export async function organizeFilesByCategory(
  directoryPath: string,
  dryRun: boolean = true
): Promise<Map<string, string[]>> {
  const scanResult = await scanDirectoryForDocuments(directoryPath, {
    recursive: true,
  });

  const categoryMap = new Map<string, string[]>();

  for (const doc of scanResult.documents) {
    const category = doc.metadata.category || 'uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(doc.filePath);
  }

  // If dryRun, return the mapping without actually moving files
  if (dryRun) {
    return categoryMap;
  }

  // Actually move files (not implemented per user requirements)
  // This would involve moving both PDF and .md files to category-specific folders

  return categoryMap;
}
