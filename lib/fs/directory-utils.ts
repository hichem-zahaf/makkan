import { promises as fs } from 'fs';
import path from 'path';

/**
 * Cache for directory sizes to avoid expensive recalculation
 */
const sizeCache = new Map<string, { size: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate the total size of a directory recursively
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
  // Check cache
  const cached = sizeCache.get(dirPath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.size;
  }

  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and common system directories
        if (entry.name.startsWith('.') || ['node_modules', '.git', 'vendor', 'build', 'dist'].includes(entry.name)) {
          continue;
        }
        totalSize += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        // Skip hidden files
        if (entry.name.startsWith('.')) {
          continue;
        }
        try {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        } catch {
          // File might have been deleted or is inaccessible
          continue;
        }
      }
    }
  } catch (error) {
    // Directory might not exist or is inaccessible
    console.error(`Error calculating directory size for ${dirPath}:`, error);
  }

  // Cache the result
  sizeCache.set(dirPath, { size: totalSize, timestamp: Date.now() });

  return totalSize;
}

/**
 * Clear the size cache for a specific directory or all directories
 */
export function clearSizeCache(dirPath?: string): void {
  if (dirPath) {
    sizeCache.delete(dirPath);
  } else {
    sizeCache.clear();
  }
}
