'use client';

import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AppSettings } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<AppSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings && originalSettings) {
      setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
    }
  }, [settings, originalSettings]);

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
      setOriginalSettings(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function getDocumentCountForLibrary(libraryPath: string): Promise<number> {
    try {
      const res = await fetch(`/api/settings/libraries/count?path=${encodeURIComponent(libraryPath)}`);
      const data = await res.json();
      return data.count || 0;
    } catch {
      return 0;
    }
  }

  async function saveSettings() {
    if (!settings) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Settings saved successfully');
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!settings) {
    return <div>Failed to load settings</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your document management system
        </p>
      </div>

      {/* View Preferences */}
      <section className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">View Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default View</label>
            <select
              value={settings.defaultView}
              onChange={(e) =>
                setSettings({ ...settings, defaultView: e.target.value as 'grid' | 'table' })
              }
              className="w-full max-w-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="grid">Grid</option>
              <option value="table">Table</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Items per page</label>
            <Input
              type="number"
              min={10}
              max={200}
              value={settings.itemsPerPage}
              onChange={(e) =>
                setSettings({ ...settings, itemsPerPage: parseInt(e.target.value) || 50 })
              }
              className="max-w-xs"
            />
          </div>
        </div>
      </section>

      {/* Libraries Management Link */}
      <section className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Libraries</h2>
            <p className="text-sm text-muted-foreground">
              Manage document libraries and scan for new files
            </p>
          </div>
          <Button onClick={() => window.location.href = '/import'}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Manage Libraries
          </Button>
        </div>
      </section>

      {/* Scan Settings */}
      <section className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">Auto-Scan</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable auto-scan</p>
              <p className="text-sm text-muted-foreground">
                Automatically scan for new files at regular intervals
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoScan}
              onChange={(e) => setSettings({ ...settings, autoScan: e.target.checked })}
              className="w-4 h-4"
            />
          </div>
          {settings.autoScan && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Scan interval (seconds)
              </label>
              <Input
                type="number"
                min={10}
                value={settings.scanInterval}
                onChange={(e) =>
                  setSettings({ ...settings, scanInterval: parseInt(e.target.value) || 60 })
                }
                className="max-w-xs"
              />
            </div>
          )}
        </div>
      </section>

      {/* Theme */}
      <section className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">Theme</h2>
        <div>
          <label className="block text-sm font-medium mb-2">Color scheme</label>
          <select
            value={settings.theme}
            onChange={(e) =>
              setSettings({
                ...settings,
                theme: e.target.value as 'light' | 'dark' | 'system',
              })
            }
            className="w-full max-w-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} size="lg" disabled={!hasChanges}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
