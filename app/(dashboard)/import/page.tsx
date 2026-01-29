'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, FolderOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LibraryCard } from '@/components/import/library-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Library } from '@/lib/types';
import { toast } from 'sonner';

interface LibraryWithStats extends Library {
  documentCount: number;
  size: number;
}

interface ScanProgress {
  libraryId: string;
  processed: number;
  total: number;
  current?: string;
}

export default function ImportPage() {
  const [libraries, setLibraries] = useState<LibraryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [scanningLibraries, setScanningLibraries] = useState<Set<string>>(new Set());
  const [scanProgress, setScanProgress] = useState<Record<string, ScanProgress>>({});
  const [libraryForm, setLibraryForm] = useState({
    name: '',
    path: '',
    organization: 'flat' as Library['organization'],
  });

  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      // Get document counts and sizes for each library
      const librariesWithStats = await Promise.all(
        (data.libraries || []).map(async (lib: Library) => {
          try {
            const [countRes, sizeRes] = await Promise.all([
              fetch(`/api/settings/libraries/count?path=${encodeURIComponent(lib.path)}`),
              fetch(`/api/settings/libraries/${lib.id}`),
            ]);

            const countData = await countRes.json();
            const sizeData = await sizeRes.json();

            return {
              ...lib,
              documentCount: countData.count || 0,
              size: sizeData.size || 0,
            };
          } catch {
            return {
              ...lib,
              documentCount: 0,
              size: 0,
            };
          }
        })
      );

      setLibraries(librariesWithStats);
    } catch (error) {
      console.error('Failed to load libraries:', error);
      toast.error('Failed to load libraries');
    } finally {
      setLoading(false);
    }
  };

  const addLibrary = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(libraryForm),
      });

      if (!res.ok) {
        throw new Error('Failed to add library');
      }

      const newLibrary = await res.json();
      await loadLibraries();
      setShowAddLibrary(false);
      setLibraryForm({ name: '', path: '', organization: 'flat' });
      toast.success(`Library "${libraryForm.name}" added successfully`);

      // Trigger instant scan
      await scanLibrary(newLibrary.id);
    } catch (error) {
      console.error('Failed to add library:', error);
      toast.error('Failed to add library');
    }
  };

  const removeLibrary = async (libraryId: string) => {
    try {
      const library = libraries.find(l => l.id === libraryId);
      if (!library) return;

      const res = await fetch(`/api/settings/libraries/${libraryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete library');
      }

      const data = await res.json();
      await loadLibraries();
      toast.success(`Library "${library.name}" and ${data.deletedDocuments || 0} documents deleted`);
    } catch (error) {
      console.error('Failed to delete library:', error);
      toast.error('Failed to delete library');
    }
  };

  const scanLibrary = async (libraryId: string) => {
    setScanningLibraries(prev => new Set(prev).add(libraryId));
    setScanProgress(prev => ({
      ...prev,
      [libraryId]: { libraryId, processed: 0, total: 0 },
    }));

    try {
      const res = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId }),
      });

      if (!res.ok) {
        throw new Error('Failed to scan library');
      }

      const data = await res.json();
      toast.success(`Found ${data.documentsFound} documents`);
      await loadLibraries();
    } catch (error) {
      console.error('Failed to scan library:', error);
      toast.error('Failed to scan library');
    } finally {
      setScanningLibraries(prev => {
        const next = new Set(prev);
        next.delete(libraryId);
        return next;
      });
      setScanProgress(prev => {
        const next = { ...prev };
        delete next[libraryId];
        return next;
      });
    }
  };

  const scanAllLibraries = async () => {
    for (const library of libraries) {
      await scanLibrary(library.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import</h1>
          <p className="text-muted-foreground mt-1">
            Manage document libraries and scan for new files
          </p>
        </div>
        <div className="flex gap-2">
          {libraries.length > 0 && (
            <Button
              variant="outline"
              onClick={scanAllLibraries}
              disabled={scanningLibraries.size > 0}
            >
              Scan All Libraries
            </Button>
          )}
          <Button onClick={() => setShowAddLibrary(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Library
          </Button>
        </div>
      </div>

      {/* Libraries Grid */}
      {libraries.length === 0 ? (
        <div className="border rounded-lg p-12 bg-card text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">No Libraries Configured</h2>
          <p className="text-muted-foreground mb-6">
            Add a library folder to start managing your documents
          </p>
          <Button onClick={() => setShowAddLibrary(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Library
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {libraries.map((library) => (
            <LibraryCard
              key={library.id}
              library={library}
              documentCount={library.documentCount}
              librarySize={library.size}
              isScanning={scanningLibraries.has(library.id)}
              scanProgress={scanProgress[library.id]}
              onScan={() => scanLibrary(library.id)}
              onRemove={() => removeLibrary(library.id)}
            />
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="border rounded-lg p-6 bg-muted/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium mb-2">About Libraries</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Libraries point to folders on your computer containing documents</li>
              <li>• Supported file types: PDF, images, videos, audio, documents, text, code, and archives</li>
              <li>• Scan libraries to import new files into the database</li>
              <li>• Files are never moved - only metadata is indexed</li>
              <li>• Removing a library deletes its documents from the database but not from your disk</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Library Dialog */}
      <Dialog open={showAddLibrary} onOpenChange={setShowAddLibrary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Library</DialogTitle>
            <DialogDescription>
              Add a new folder to scan for documents
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
                placeholder="C:\Users\YourName\Downloads"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <Select
                value={libraryForm.organization}
                onValueChange={(value) =>
                  setLibraryForm({
                    ...libraryForm,
                    organization: value as Library['organization'],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat (all files in one folder)</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="year">By Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLibrary(false)}>
              Cancel
            </Button>
            <Button onClick={addLibrary} disabled={!libraryForm.name || !libraryForm.path}>
              Add Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
