/**
 * File Watcher Server
 *
 * This module manages the background file watching service for monitoring
 * changes to PDF and markdown files in configured library directories.
 *
 * The file watcher runs alongside the Next.js server and communicates
 * via Server-Sent Events (SSE) to provide real-time updates to clients.
 */

import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { refreshDocumentCache } from '../services/document-service';
import { loadSettings } from '../services/settings-service';

export interface FileWatcherConfig {
  libraryId: string;
  libraryPath: string;
}

class FileWatcherServer {
  private watchers: Map<string, FSWatcher> = new Map();
  private eventCallbacks: Set<(event: FileWatchEvent) => void> = new Set();
  private isInitialized = false;

  /**
   * Initialize the file watcher server
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const settings = await loadSettings();

    for (const library of settings.libraries) {
      await this.watchLibrary(library.id, library.path);
    }

    this.isInitialized = true;
  }

  /**
   * Watch a library directory for changes
   */
  async watchLibrary(libraryId: string, libraryPath: string): Promise<void> {
    if (this.watchers.has(libraryId)) {
      return; // Already watching
    }

    try {
      const watcher = chokidar.watch(libraryPath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
      });

      watcher
        .on('add', (filePath) => this.handleFileAdd(libraryId, filePath))
        .on('change', (filePath) => this.handleFileChange(libraryId, filePath))
        .on('unlink', (filePath) => this.handleFileDelete(libraryId, filePath));

      this.watchers.set(libraryId, watcher);
    } catch (error) {
      console.error(`Failed to watch library ${libraryId}:`, error);
    }
  }

  /**
   * Stop watching a library
   */
  unwatchLibrary(libraryId: string): void {
    const watcher = this.watchers.get(libraryId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(libraryId);
    }
  }

  /**
   * Stop all watchers
   */
  stopAll(): void {
    for (const [libraryId, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.isInitialized = false;
  }

  /**
   * Register a callback for file events
   */
  onFileEvent(callback: (event: FileWatchEvent) => void): () => void {
    this.eventCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Emit a file event to all registered callbacks
   */
  private emitEvent(event: FileWatchEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in file event callback:', error);
      }
    }
  }

  /**
   * Handle file addition
   */
  private async handleFileAdd(libraryId: string, filePath: string): Promise<void> {
    if (!filePath.endsWith('.pdf') && !filePath.endsWith('.md')) {
      return;
    }

    this.emitEvent({
      type: 'add',
      libraryId,
      path: filePath,
      timestamp: new Date().toISOString(),
    });

    // Refresh document cache
    await this.refreshCache();
  }

  /**
   * Handle file change
   */
  private async handleFileChange(
    libraryId: string,
    filePath: string
  ): Promise<void> {
    if (!filePath.endsWith('.pdf') && !filePath.endsWith('.md')) {
      return;
    }

    this.emitEvent({
      type: 'change',
      libraryId,
      path: filePath,
      timestamp: new Date().toISOString(),
    });

    // Refresh document cache
    await this.refreshCache();
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(
    libraryId: string,
    filePath: string
  ): Promise<void> {
    if (!filePath.endsWith('.pdf') && !filePath.endsWith('.md')) {
      return;
    }

    this.emitEvent({
      type: 'unlink',
      libraryId,
      path: filePath,
      timestamp: new Date().toISOString(),
    });

    // Refresh document cache
    await this.refreshCache();
  }

  /**
   * Refresh the document cache
   */
  private async refreshCache(): Promise<void> {
    try {
      await refreshDocumentCache();
    } catch (error) {
      console.error('Failed to refresh document cache:', error);
    }
  }

  /**
   * Get the status of all watchers
   */
  getStatus(): Array<{ libraryId: string; isWatching: boolean }> {
    return Array.from(this.watchers.keys()).map((libraryId) => ({
      libraryId,
      isWatching: true,
    }));
  }
}

export interface FileWatchEvent {
  type: 'add' | 'change' | 'unlink';
  libraryId: string;
  path: string;
  timestamp: string;
}

// Global singleton instance
let fileWatcherServer: FileWatcherServer | null = null;

export function getFileWatcherServer(): FileWatcherServer {
  if (!fileWatcherServer) {
    fileWatcherServer = new FileWatcherServer();
  }
  return fileWatcherServer;
}
