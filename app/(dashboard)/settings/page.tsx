'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, FolderOpen, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AppSettings, Library } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [libraryForm, setLibraryForm] = useState({
    name: '',
    path: '',
    organization: 'flat' as Library['organization'],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  }

  async function addLibrary() {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(libraryForm),
      });

      if (!res.ok) {
        throw new Error('Failed to add library');
      }

      await loadSettings();
      setShowAddLibrary(false);
      setLibraryForm({ name: '', path: '', organization: 'flat' });
    } catch (error) {
      console.error('Failed to add library:', error);
      alert('Failed to add library');
    }
  }

  async function updateLibrary() {
    if (!editingLibrary) return;

    try {
      const res = await fetch(`/api/settings/libraries/${editingLibrary.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(libraryForm),
      });

      if (!res.ok) {
        throw new Error('Failed to update library');
      }

      await loadSettings();
      setEditingLibrary(null);
      setLibraryForm({ name: '', path: '', organization: 'flat' });
    } catch (error) {
      console.error('Failed to update library:', error);
      alert('Failed to update library');
    }
  }

  async function deleteLibrary(id: string) {
    if (!confirm('Are you sure you want to remove this library?')) return;

    try {
      const res = await fetch(`/api/settings/libraries/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete library');
      }

      await loadSettings();
    } catch (error) {
      console.error('Failed to delete library:', error);
      alert('Failed to delete library');
    }
  }

  function openEditDialog(library: Library) {
    setEditingLibrary(library);
    setLibraryForm({
      name: library.name,
      path: library.path,
      organization: library.organization,
    });
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

      {/* Libraries */}
      <section className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Libraries</h2>
          <Button onClick={() => setShowAddLibrary(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Library
          </Button>
        </div>

        {settings.libraries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No libraries configured</p>
            <p className="text-sm">Add a library to start managing your documents</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settings.libraries.map((library) => (
              <div
                key={library.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{library.name}</h3>
                  <p className="text-sm text-muted-foreground">{library.path}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{library.organization}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(library)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteLibrary(library.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <Button onClick={saveSettings} size="lg">
          Save Settings
        </Button>
      </div>

      {/* Add Library Dialog */}
      <Dialog open={showAddLibrary} onOpenChange={setShowAddLibrary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Library</DialogTitle>
            <DialogDescription>
              Add a new folder to scan for PDF documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={libraryForm.name}
                onChange={(e) =>
                  setLibraryForm({ ...libraryForm, name: e.target.value })
                }
                placeholder="My Documents"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Path</label>
              <Input
                value={libraryForm.path}
                onChange={(e) =>
                  setLibraryForm({ ...libraryForm, path: e.target.value })
                }
                placeholder="/path/to/documents"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <select
                value={libraryForm.organization}
                onChange={(e) =>
                  setLibraryForm({
                    ...libraryForm,
                    organization: e.target.value as Library['organization'],
                  })
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="flat">Flat (all files in one folder)</option>
                <option value="category">By Category</option>
                <option value="year">By Year</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLibrary(false)}>
              Cancel
            </Button>
            <Button onClick={addLibrary}>Add Library</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Library Dialog */}
      <Dialog open={!!editingLibrary} onOpenChange={(open) => !open && setEditingLibrary(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Library</DialogTitle>
            <DialogDescription>Update library configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={libraryForm.name}
                onChange={(e) =>
                  setLibraryForm({ ...libraryForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Path</label>
              <Input
                value={libraryForm.path}
                onChange={(e) =>
                  setLibraryForm({ ...libraryForm, path: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <select
                value={libraryForm.organization}
                onChange={(e) =>
                  setLibraryForm({
                    ...libraryForm,
                    organization: e.target.value as Library['organization'],
                  })
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="flat">Flat (all files in one folder)</option>
                <option value="category">By Category</option>
                <option value="year">By Year</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLibrary(null)}>
              Cancel
            </Button>
            <Button onClick={updateLibrary}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
