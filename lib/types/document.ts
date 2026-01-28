import type { DocumentMetadata } from './metadata';

export interface Document {
  id: string; // UUID
  filePath: string; // Absolute path to PDF
  fileName: string;
  fileSize: number; // in bytes
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentListItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  title: string;
  author?: string;
  category?: string;
  tags: string[];
  readStatus?: ReadStatus;
  rating?: number;
  dateAdded?: Date;
}

export type ReadStatus = 'unread' | 'reading' | 'read';

export interface DocumentFilter {
  search?: string;
  category?: string;
  tags?: string[];
  author?: string;
  readStatus?: ReadStatus;
  rating?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DocumentSort {
  field: SortField;
  direction: 'asc' | 'desc';
}

export type SortField =
  | 'title'
  | 'author'
  | 'dateAdded'
  | 'dateModified'
  | 'fileName'
  | 'fileSize'
  | 'rating';
