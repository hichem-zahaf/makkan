'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface NotificationHistoryItem {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
  dismissed: boolean;
}

const STORAGE_KEY = 'makkan_notification_history';
const MAX_HISTORY = 100;

export function useNotificationHistory() {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save notification history:', error);
      }
    }
  }, [history, loaded]);

  const addNotification = (
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const id = crypto.randomUUID();
    const notification: NotificationHistoryItem = {
      id,
      title,
      description,
      type,
      timestamp: Date.now(),
      dismissed: false,
    };

    setHistory((prev) => {
      const newHistory = [notification, ...prev].slice(0, MAX_HISTORY);
      return newHistory;
    });

    // Show toast with sonner
    switch (type) {
      case 'success':
        toast.success(title, { description, id });
        break;
      case 'error':
        toast.error(title, { description, id });
        break;
      case 'warning':
        toast.warning(title, { description, id });
        break;
      default:
        toast.info(title, { description, id });
    }

    return id;
  };

  const dismissNotification = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dismissed: true } : item))
    );
    toast.dismiss(id);
  };

  const clearHistory = () => {
    setHistory([]);
    toast.dismiss();
  };

  const getActiveNotifications = () => {
    return history.filter((item) => !item.dismissed);
  };

  return {
    history,
    loaded,
    addNotification,
    dismissNotification,
    clearHistory,
    getActiveNotifications,
  };
}
