import { z } from 'zod';

// Document metadata validation schema
export const documentMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  date_added: z.string().optional(),
  date_modified: z.string().optional(),
  read_status: z.enum(['unread', 'reading', 'read']).optional(),
  rating: z.number().min(1).max(5).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

// Document validation schema
export const documentSchema = z.object({
  id: z.string().min(1),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().nonnegative(),
  metadata: documentMetadataSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Library validation schema
export const librarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Library name is required'),
  path: z.string().min(1, 'Library path is required'),
  organization: z.enum(['flat', 'category', 'year']),
});

// Settings validation schema
export const settingsSchema = z.object({
  libraries: z.array(librarySchema),
  defaultView: z.enum(['grid', 'table']).default('grid'),
  itemsPerPage: z.number().min(1).max(200).default(50),
  autoScan: z.boolean().default(false),
  scanInterval: z.number().min(10).default(60),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

// Saved search validation schema
export const savedSearchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Search name is required'),
  query: z.string().min(1),
  filters: z.record(z.unknown()),
  createdAt: z.coerce.date(),
});

// Type exports
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type LibraryInput = z.infer<typeof librarySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
