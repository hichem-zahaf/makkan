import { promises as fs } from 'fs';
import path from 'path';
import type { Document } from '../types';
import {
  readMarkdownFile,
  frontmatterToMetadata,
  createDefaultMetadata,
  getCompanionMarkdownPath,
} from './metadata-parser';
import {
  generateDocumentId,
  getFileName,
  getExtension,
  normalizePath,
} from '../utils';

/**
 * Result of scanning a directory for documents
 */
export interface ScanResult {
  documents: Document[];
  errors: ScanError[];
  stats: ScanStats;
}

export interface ScanError {
  path: string;
  error: string;
}

export interface ScanStats {
  totalFound: number;
  withMetadata: number;
  withoutMetadata: number;
  errors: number;
}

/**
 * Options for scanning a directory
 */
export interface ScanOptions {
  recursive?: boolean;
  includeOrphans?: boolean; // PDFs without .md files
  maxDepth?: number;
}

/**
 * Scan a directory for PDF documents with optional companion markdown files
 */
export async function scanDirectoryForDocuments(
  directoryPath: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const {
    recursive = true,
    includeOrphans = true,
    maxDepth = 10,
  } = options;

  const documents: Document[] = [];
  const errors: ScanError[] = [];
  const stats: ScanStats = {
    totalFound: 0,
    withMetadata: 0,
    withoutMetadata: 0,
    errors: 0,
  };

  try {
    // Check if directory exists
    await fs.access(directoryPath);
  } catch {
    return {
      documents: [],
      errors: [{ path: directoryPath, error: 'Directory does not exist' }],
      stats,
    };
  }

  // Scan the directory
  const entries = await scanDirectoryRecursive(directoryPath, {
    recursive,
    maxDepth,
    currentDepth: 0,
  });

  // Process each entry
  for (const entry of entries) {
    if (entry.error) {
      errors.push({ path: entry.path, error: entry.error });
      stats.errors++;
      continue;
    }

    if (!entry.isPdf) {
      continue;
    }

    stats.totalFound++;

    try {
      const doc = await processDocument(entry.path);
      documents.push(doc);

      if (entry.hasMetadata) {
        stats.withMetadata++;
      } else {
        stats.withoutMetadata++;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push({ path: entry.path, error: errorMessage });
      stats.errors++;
    }
  }

  return { documents, errors, stats };
}

/**
 * Recursively scan a directory
 */
async function scanDirectoryRecursive(
  dirPath: string,
  options: {
    recursive: boolean;
    maxDepth: number;
    currentDepth: number;
  }
): Promise<
  Array<{ path: string; isPdf: boolean; hasMetadata: boolean; error?: string }>
> {
  const { recursive, maxDepth, currentDepth } = options;
  const results: Array<{
    path: string;
    isPdf: boolean;
    hasMetadata: boolean;
    error?: string;
  }> = [];

  // Check max depth
  if (currentDepth >= maxDepth) {
    return results;
  }

  let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true }) as typeof entries;
  } catch (error) {
    return [
      {
        path: dirPath,
        isPdf: false,
        hasMetadata: false,
        error: error instanceof Error ? error.message : 'Failed to read directory',
      },
    ];
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip hidden files and directories
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isDirectory()) {
      if (recursive) {
        const subResults = await scanDirectoryRecursive(fullPath, {
          recursive,
          maxDepth,
          currentDepth: currentDepth + 1,
        });
        results.push(...subResults);
      }
    } else if (entry.isFile()) {
      const ext = getExtension(entry.name);
      const isPdf = ext === '.pdf';

      if (isPdf) {
        const mdPath = getCompanionMarkdownPath(fullPath);
        let hasMetadata = false;
        try {
          await fs.access(mdPath);
          hasMetadata = true;
        } catch {
          // No metadata file
        }
        results.push({ path: fullPath, isPdf, hasMetadata });
      }
    }
  }

  return results;
}

/**
 * Process a single document and create a Document object
 */
async function processDocument(pdfPath: string): Promise<Document> {
  const fileName = getFileName(pdfPath);
  const mdPath = getCompanionMarkdownPath(pdfPath);

  // Get file stats
  const fileStats = await fs.stat(pdfPath);
  const now = new Date();

  let metadata;
  try {
    const markdownContent = await readMarkdownFile(mdPath);
    if (markdownContent.frontmatter.title) {
      metadata = frontmatterToMetadata(markdownContent.frontmatter);
    } else {
      // Create default metadata if title is empty
      metadata = createDefaultMetadata(fileName);
    }
  } catch {
    // If markdown file doesn't exist or is invalid, create default metadata
    metadata = createDefaultMetadata(fileName);
  }

  return {
    id: generateDocumentId(pdfPath),
    filePath: normalizePath(pdfPath),
    fileName,
    fileSize: fileStats.size,
    metadata,
    createdAt: fileStats.birthtime,
    updatedAt: fileStats.mtime,
  };
}

/**
 * Scan for orphan PDFs (PDFs without companion markdown files)
 */
export async function scanForOrphanPdfs(
  directoryPath: string
): Promise<string[]> {
  const result = await scanDirectoryForDocuments(directoryPath, {
    recursive: true,
  });

  return result.documents
    .filter((doc) => {
      // Check if document has minimal metadata (likely auto-generated)
      return (
        !doc.metadata.author &&
        !doc.metadata.category &&
        doc.metadata.tags.length === 0 &&
        !doc.metadata.notes
      );
    })
    .map((doc) => doc.filePath);
}
