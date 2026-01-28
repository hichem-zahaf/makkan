import { NextRequest } from 'next/server';
import { createDocumentWatcher, type FileChangeEvent } from '@/lib/fs/file-watcher';
import { loadSettings } from '@/services/settings-service';
import { refreshDocumentCache } from '@/services/document-service';

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

// Store active watchers
const watchers = new Map<string, ReturnType<typeof createDocumentWatcher>>();

/**
 * Start watching all libraries
 */
async function startWatching() {
  const settings = await loadSettings();

  for (const library of settings.libraries) {
    if (watchers.has(library.id)) {
      continue; // Already watching this library
    }

    const watcher = createDocumentWatcher(
      library.path,
      async (pdfPath: string, eventType: string) => {
        // Refresh the document cache when files change
        await refreshDocumentCache();

        // Notify all connected clients
        const event = {
          type: eventType,
          libraryId: library.id,
          path: pdfPath,
          timestamp: new Date().toISOString(),
        };

        for (const controller of connections) {
          try {
            controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
          } catch {
            // Connection might be closed, remove it
            connections.delete(controller);
          }
        }
      },
      {
        ignoreInitial: true,
      }
    );

    watchers.set(library.id, watcher);
  }
}

/**
 * Stop watching all libraries
 */
function stopWatching() {
  for (const [id, watcher] of watchers) {
    watcher.close();
    watchers.delete(id);
  }
}

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time file updates
 */
export async function GET(request: NextRequest) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the set
      connections.add(controller);

      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Start watching if not already started
      startWatching();

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        } catch {
          clearInterval(heartbeat);
          connections.delete(controller);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(controller);

        // If no more connections, stop watching
        if (connections.size === 0) {
          stopWatching();
        }
      });
    },
  });

  return new Response(stream, { headers });
}
