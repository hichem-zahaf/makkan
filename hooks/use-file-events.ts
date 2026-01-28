'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface FileEvent {
  type: 'add' | 'change' | 'unlink' | 'connected' | 'heartbeat';
  libraryId?: string;
  path?: string;
  timestamp: string;
}

export interface UseFileEventsOptions {
  onFileAdded?: (event: FileEvent) => void;
  onFileChanged?: (event: FileEvent) => void;
  onFileRemoved?: (event: FileEvent) => void;
  onConnected?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useFileEvents({
  onFileAdded,
  onFileChanged,
  onFileRemoved,
  onConnected,
  onError,
  enabled = true,
}: UseFileEventsOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create EventSource connection
    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      onConnected?.();
    };

    eventSource.onerror = (error) => {
      setIsConnected(false);
      onError?.(error);
    };

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data: FileEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'add':
            onFileAdded?.(data);
            break;
          case 'change':
            onFileChanged?.(data);
            break;
          case 'unlink':
            onFileRemoved?.(data);
            break;
          case 'connected':
            setIsConnected(true);
            break;
        }
      } catch (error) {
        console.error('Failed to parse file event:', error);
      }
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, onFileAdded, onFileChanged, onFileRemoved, onConnected, onError]);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    close,
  };
}
