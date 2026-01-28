import type { ReadStatus } from './document';

export interface DocumentMetadata {
  title: string;
  author?: string;
  category?: string;
  tags: string[];
  dateAdded?: Date;
  dateModified?: Date;
  readStatus?: ReadStatus;
  rating?: number; // 1-5
  source?: string;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface MetadataFrontmatter {
  title: string;
  author?: string;
  category?: string;
  tags?: string[];
  date_added?: string; // ISO date string
  date_modified?: string; // ISO date string
  read_status?: ReadStatus;
  rating?: number;
  source?: string;
  notes?: string;
  [key: string]: string | string[] | number | undefined;
}

export interface MarkdownContent {
  frontmatter: MetadataFrontmatter;
  content: string;
}
