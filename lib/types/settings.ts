export type ViewMode = 'grid' | 'table';

export interface Library {
  id: string;
  name: string;
  path: string; // Absolute path
  organization: 'flat' | 'category' | 'year';
}

export interface AppSettings {
  libraries: Library[];
  defaultView: ViewMode;
  itemsPerPage: number;
  autoScan: boolean;
  scanInterval: number; // in seconds
  theme: 'light' | 'dark' | 'system';
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  createdAt: Date;
}
