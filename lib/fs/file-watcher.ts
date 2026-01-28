import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { getExtension } from '../utils';
import { getCompanionMarkdownPath } from './metadata-parser';

/**
 * File change event types
 */
export type FileEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileEventType;
  path: string;
  isPdf?: boolean;
  isMarkdown?: boolean;
}

/**
 * File watcher event handler
 */
export type FileEventHandler = (event: FileChangeEvent) => void;

/**
 * File watcher options
 */
export interface FileWatcherOptions {
  ignoreInitial?: boolean;
  persistent?: boolean;
  ignored?: string | RegExp | ((path: string) => boolean);
}

/**
 * Create a file watcher for a directory
 */
export function createFileWatcher(
  directoryPath: string,
  handler: FileEventHandler,
  options: FileWatcherOptions = {}
): FSWatcher {
  const {
    ignoreInitial = false,
    persistent = true,
    ignored = /(^|[\/\\])\../, // Ignore dotfiles by default
  } = options;

  const watcher = chokidar.watch(directoryPath, {
    ignored,
    persistent,
    ignoreInitial,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  // Handle file additions
  watcher.on('add', (filePath) => {
    const ext = getExtension(filePath);
    const isPdf = ext === '.pdf';
    const isMarkdown = ext === '.md';

    // Only notify about PDFs and markdown files
    if (isPdf || isMarkdown) {
      handler({
        type: 'add',
        path: filePath,
        isPdf,
        isMarkdown,
      });
    }
  });

  // Handle file changes
  watcher.on('change', (filePath) => {
    const ext = getExtension(filePath);
    const isPdf = ext === '.pdf';
    const isMarkdown = ext === '.md';

    // Only notify about PDFs and markdown files
    if (isPdf || isMarkdown) {
      handler({
        type: 'change',
        path: filePath,
        isPdf,
        isMarkdown,
      });
    }
  });

  // Handle file deletions
  watcher.on('unlink', (filePath) => {
    const ext = getExtension(filePath);
    const isPdf = ext === '.pdf';
    const isMarkdown = ext === '.md';

    // Only notify about PDFs and markdown files
    if (isPdf || isMarkdown) {
      handler({
        type: 'unlink',
        path: filePath,
        isPdf,
        isMarkdown,
      });
    }
  });

  // Handle directory additions
  watcher.on('addDir', (dirPath) => {
    handler({
      type: 'addDir',
      path: dirPath,
    });
  });

  // Handle directory deletions
  watcher.on('unlinkDir', (dirPath) => {
    handler({
      type: 'unlinkDir',
      path: dirPath,
    });
  });

  // Handle errors
  watcher.on('error', (error) => {
    console.error('File watcher error:', error);
  });

  return watcher;
}

/**
 * Create a file watcher that watches for both PDF and markdown files
 * and emits events for the PDF when either the PDF or its companion markdown changes
 */
export function createDocumentWatcher(
  directoryPath: string,
  handler: (pdfPath: string, eventType: FileEventType) => void,
  options: FileWatcherOptions = {}
): FSWatcher {
  const fileEventHandler = (event: FileChangeEvent) => {
    if (event.isPdf) {
      // Direct PDF change
      handler(event.path, event.type);
    } else if (event.isMarkdown) {
      // Markdown change - find the companion PDF
      const pdfPath = event.path.replace(/\.md$/, '.pdf');
      handler(pdfPath, event.type);
    }
  };

  return createFileWatcher(directoryPath, fileEventHandler, options);
}

/**
 * Debounce file events to avoid processing multiple rapid changes
 */
export function createDebouncedHandler(
  handler: FileEventHandler,
  delay: number = 1000
): FileEventHandler {
  const pendingEvents = new Map<string, FileEventType>();

  const timeout = setInterval(() => {
    if (pendingEvents.size === 0) {
      return;
    }

    // Process all pending events
    for (const [path, type] of pendingEvents) {
      handler({ type, path });
    }

    pendingEvents.clear();
  }, delay);

  return (event: FileChangeEvent) => {
    // Store the latest event for each path
    pendingEvents.set(event.path, event.type);
  };

  // Return a function to stop the debouncer
  return function debouncedHandler(event: FileChangeEvent) {
    pendingEvents.set(event.path, event.type);
  };
}
