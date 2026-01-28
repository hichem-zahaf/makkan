import path from 'path';

/**
 * Get the directory path of a file
 */
export function getDirectoryPath(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Get the file extension
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Get the file name without extension
 */
export function getFileNameWithoutExtension(filePath: string): string {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);
  return fileName.slice(0, -ext.length);
}

/**
 * Get the file name with extension
 */
export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Check if a path is within another path
 */
export function isPathWithin(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Normalize a path for consistent comparison
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Get relative path between two paths
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Convert a file path to a safe URL path
 * Replaces backslashes with forward slashes and removes drive letters on Windows
 */
export function pathToUrl(filePath: string): string {
  let normalized = filePath.replace(/\\/g, '/');
  // Remove Windows drive letter (e.g., "C:/")
  if (normalized.match(/^[a-z]:/i)) {
    normalized = normalized.substring(2);
  }
  // Remove leading slash if present
  if (normalized.startsWith('/')) {
    normalized = normalized.substring(1);
  }
  return normalized;
}

/**
 * Generate a unique ID for a document based on its file path
 */
export function generateDocumentId(filePath: string): string {
  // Use a simple hash of the file path
  let hash = 0;
  const normalizedPath = normalizePath(filePath);
  for (let i = 0; i < normalizedPath.length; i++) {
    const char = normalizedPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Sanitize a file name to remove invalid characters
 */
export function sanitizeFileName(fileName: string): string {
  // Remove invalid characters for Windows filenames
  return fileName.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
