import matter from 'gray-matter';
import { promises as fs } from 'fs';
import type {
  DocumentMetadata,
  MetadataFrontmatter,
  MarkdownContent,
  ReadStatus,
} from '../types';
import {
  getFileNameWithoutExtension,
  joinPath,
  generateDocumentId,
} from '../utils';

/**
 * Parse markdown file content to extract frontmatter and content
 */
export function parseMarkdown(content: string): MarkdownContent {
  const { data, content: markdownContent } = matter(content);
  return {
    frontmatter: data as MetadataFrontmatter,
    content: markdownContent,
  };
}

/**
 * Serialize metadata and content to markdown format
 */
export function serializeMarkdown(
  metadata: DocumentMetadata,
  content: string = ''
): string {
  const frontmatter: Record<string, unknown> = {
    title: metadata.title,
  };

  if (metadata.author) frontmatter.author = metadata.author;
  if (metadata.category) frontmatter.category = metadata.category;
  if (metadata.tags && metadata.tags.length > 0)
    frontmatter.tags = metadata.tags;
  if (metadata.dateAdded)
    frontmatter.date_added = metadata.dateAdded.toISOString().split('T')[0];
  if (metadata.dateModified)
    frontmatter.date_modified =
      metadata.dateModified.toISOString().split('T')[0];
  if (metadata.readStatus) frontmatter.read_status = metadata.readStatus;
  if (metadata.rating) frontmatter.rating = metadata.rating;
  if (metadata.source) frontmatter.source = metadata.source;
  if (metadata.notes) frontmatter.notes = metadata.notes;

  // Add custom fields
  if (metadata.customFields) {
    Object.entries(metadata.customFields).forEach(([key, value]) => {
      if (!frontmatter[key]) {
        frontmatter[key] = value;
      }
    });
  }

  return matter.stringify(content, frontmatter);
}

/**
 * Convert frontmatter to DocumentMetadata
 */
export function frontmatterToMetadata(
  frontmatter: MetadataFrontmatter
): DocumentMetadata {
  const metadata: DocumentMetadata = {
    title: frontmatter.title,
    tags: frontmatter.tags || [],
  };

  if (frontmatter.author) metadata.author = frontmatter.author;
  if (frontmatter.category) metadata.category = frontmatter.category;
  if (frontmatter.read_status) metadata.readStatus = frontmatter.read_status;
  if (frontmatter.rating) metadata.rating = frontmatter.rating;
  if (frontmatter.source) metadata.source = frontmatter.source;
  if (frontmatter.notes) metadata.notes = frontmatter.notes;

  if (frontmatter.date_added) {
    metadata.dateAdded = new Date(frontmatter.date_added);
  }
  if (frontmatter.date_modified) {
    metadata.dateModified = new Date(frontmatter.date_modified);
  }

  // Extract custom fields (fields not in the standard set)
  const standardFields = new Set([
    'title',
    'author',
    'category',
    'tags',
    'date_added',
    'date_modified',
    'read_status',
    'rating',
    'source',
    'notes',
  ]);

  const customFields: Record<string, string | number | boolean> = {};
  Object.entries(frontmatter).forEach(([key, value]) => {
    if (!standardFields.has(key) && value !== undefined) {
      customFields[key] = value as string | number | boolean;
    }
  });

  if (Object.keys(customFields).length > 0) {
    metadata.customFields = customFields;
  }

  return metadata;
}

/**
 * Read markdown file and parse its content
 */
export async function readMarkdownFile(
  filePath: string
): Promise<MarkdownContent> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseMarkdown(content);
  } catch (error) {
    // If file doesn't exist or can't be read, return empty content
    return {
      frontmatter: { title: '' },
      content: '',
    };
  }
}

/**
 * Write markdown file with metadata
 */
export async function writeMarkdownFile(
  filePath: string,
  metadata: DocumentMetadata,
  content: string = ''
): Promise<void> {
  const markdown = serializeMarkdown(metadata, content);
  await fs.writeFile(filePath, markdown, 'utf-8');
}

/**
 * Create default metadata for a document
 */
export function createDefaultMetadata(
  fileName: string,
  category?: string
): DocumentMetadata {
  const title = getFileNameWithoutExtension(fileName);
  const now = new Date();

  return {
    title,
    tags: [],
    dateAdded: now,
    dateModified: now,
    readStatus: 'unread',
    category,
  };
}

/**
 * Get the companion markdown file path for a PDF
 */
export function getCompanionMarkdownPath(pdfPath: string): string {
  const dir = getFileNameWithoutExtension(pdfPath);
  // Actually we need to get the directory and append .md
  const pdfDir = pdfPath.substring(0, pdfPath.lastIndexOf('.')) || pdfPath;
  return `${pdfDir}.md`;
}

/**
 * Check if a markdown file exists for a PDF
 */
export async function hasCompanionMarkdown(pdfPath: string): Promise<boolean> {
  try {
    const mdPath = getCompanionMarkdownPath(pdfPath);
    await fs.access(mdPath);
    return true;
  } catch {
    return false;
  }
}
