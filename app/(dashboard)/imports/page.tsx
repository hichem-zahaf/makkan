'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FolderOpen,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Library } from '@/lib/types';

interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentFile?: string;
  errors: Array<{ path: string; error: string }>;
}

export default function ImportPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<{
    documents: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    loadLibraries();
  }, []);

  async function loadLibraries() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setLibraries(data.libraries || []);
      if (data.libraries?.[0]) {
        setSelectedLibrary(data.libraries[0].id);
      }
    } catch (error) {
      console.error('Failed to load libraries:', error);
    }
  }

  async function startImport() {
    if (!selectedLibrary) {
      alert('Please select a library');
      return;
    }

    setImporting(true);
    setProgress(null);
    setResult(null);

    try {
      const res = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId: selectedLibrary }),
      });

      if (!res.ok) {
        throw new Error('Failed to scan directory');
      }

      const data = await res.json();
      setResult({
        documents: data.documentsFound,
        errors: data.stats.errors,
      });
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  const progressPercentage = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Documents</h1>
          <p className="text-muted-foreground mt-1">
            Scan and import PDFs from your library folders
          </p>
        </div>
      </div>

      {/* Library Selection */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">Select Library</h2>
        {libraries.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">No libraries configured</p>
            <Button className="mt-4" onClick={() => router.push('/settings')}>
              Configure Library
            </Button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-2">
              Choose a library to scan
            </label>
            <Select value={selectedLibrary} onValueChange={setSelectedLibrary}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a library" />
              </SelectTrigger>
              <SelectContent>
                {libraries.map((lib) => (
                  <SelectItem key={lib.id} value={lib.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      {lib.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLibrary && (
              <div className="mt-2 text-sm text-muted-foreground">
                {libraries.find((l) => l.id === selectedLibrary)?.path}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Options */}
      {selectedLibrary && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">Import Options</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm">Create metadata files for PDFs without them</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm">Auto-categorize by folder name</span>
            </label>
          </div>
        </div>
      )}

      {/* Start Import Button */}
      {selectedLibrary && (
        <div className="flex justify-center">
          <Button
            onClick={startImport}
            disabled={importing}
            size="lg"
            className="w-full max-w-xs"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Scanning...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Start Import
              </>
            )}
          </Button>
        </div>
      )}

      {/* Progress */}
      {importing && progress && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">Import Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Processing...</span>
                <span>{progress.processed} / {progress.total}</span>
              </div>
              <Progress value={progressPercentage} />
            </div>
            {progress.currentFile && (
              <div className="text-sm text-muted-foreground">
                Current: {progress.currentFile}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{progress.succeeded}</p>
                <p className="text-sm text-muted-foreground">Succeeded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{progress.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{progress.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !importing && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">Import Complete</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Documents Found</p>
                <p className="text-2xl font-bold">{result.documents}</p>
              </div>
            </div>
            {result.errors > 0 && (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold">{result.errors}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => router.push('/documents')}>
              View Documents
            </Button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="border rounded-lg p-6 bg-muted/20">
        <h3 className="font-medium mb-2">About Import</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Scans the selected library folder for PDF files</li>
          <li>• Creates companion .md files for metadata management</li>
          <li>• Preserves your existing file organization</li>
          <li>• Files are NOT moved - only metadata is created/updated</li>
        </ul>
      </div>
    </div>
  );
}
