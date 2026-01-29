import type { DocumentMetadata } from './metadata';

export interface Document {
  id: string; // UUID
  filePath: string; // Absolute path to PDF
  fileName: string;
  fileSize: number; // in bytes
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
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
  dateModified?: Date;
  isFavorite?: boolean;
  project?: string;
  language?: string;
  fileType?: string;
  libraryId?: string;
}

export type ReadStatus = 'unread' | 'reading' | 'read';

export interface DocumentFilter {
  query?: string;
  search?: string;
  category?: string;
  tags?: string[];
  fileTypes?: string[];
  author?: string;
  readStatus?: ReadStatus;
  rating?: number;
  dateFrom?: string;
  dateTo?: string;
  isFavorite?: boolean;
  project?: string;
  language?: string;
  fileType?: string;
  libraryId?: string;
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
  | 'rating'
  | 'isFavorite'
  | 'project'
  | 'language'
  | 'fileType';

export interface BatchOperation {
  action: 'delete' | 'export' | 'tag' | 'move' | 'duplicate';
  documentIds: string[];
  options?: {
    tags?: string[];
    targetLibrary?: string;
    exportFormat?: 'json' | 'markdown';
  };
}
