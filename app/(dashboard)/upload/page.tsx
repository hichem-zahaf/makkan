'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadZone } from '@/components/upload/upload-zone';
import { UploadProgressList } from '@/components/upload/upload-progress';
import type { Library } from '@/lib/types';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load libraries on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setLibraries(data.libraries || []);
        if (data.libraries?.[0]) {
          setSelectedLibrary(data.libraries[0].id);
        }
      });
  }, []);

  const handleFileUpload = async (files: File[]) => {
    if (!selectedLibrary) {
      alert('Please select a library first');
      return;
    }

    setUploading(true);
    const newUploads: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadIndex = uploads.length + i;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('libraryId', selectedLibrary);
        if (category) formData.append('category', category);
        if (tags) formData.append('tags', tags);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === uploadIndex ? { ...u, progress } : u
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === uploadIndex ? { ...u, status: 'success', progress: 100 } : u
              )
            );
          } else {
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === uploadIndex
                  ? { ...u, status: 'error', error: 'Upload failed' }
                  : u
              )
            );
          }
        };

        xhr.onerror = () => {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex
                ? { ...u, status: 'error', error: 'Network error' }
                : u
            )
          );
        };

        xhr.open('POST', '/api/files/upload');
        xhr.send(formData);
      } catch (error) {
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex
              ? { ...u, status: 'error', error: 'Upload failed' }
              : u
          )
        );
      }
    }

    setUploading(false);
  };

  const handleRemoveUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const completedUploads = uploads.filter((u) => u.status === 'success');
  const hasFailedUploads = uploads.some((u) => u.status === 'error');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground mt-1">
            Add PDF files to your library
          </p>
        </div>
      </div>

      {/* Upload Settings */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Upload Settings</h2>

        {/* Library Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Library</label>
          <Select value={selectedLibrary} onValueChange={setSelectedLibrary}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a library" />
            </SelectTrigger>
            <SelectContent>
              {libraries.map((lib) => (
                <SelectItem key={lib.id} value={lib.id}>
                  {lib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {libraries.find((l) => l.id === selectedLibrary) && (
            <p className="text-xs text-muted-foreground mt-1">
              {libraries.find((l) => l.id === selectedLibrary)!.path}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">Category (optional)</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Research Papers, Books, Articles"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">Tags (optional)</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma-separated tags, e.g., ai, machine-learning, 2024"
          />
        </div>
      </div>

      {/* Upload Zone */}
      <UploadZone
        onUpload={handleFileUpload}
        accept=".pdf"
        multiple
        disabled={!selectedLibrary || uploading}
      />

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">Upload Progress</h2>
          <UploadProgressList
            uploads={uploads}
            onRemove={handleRemoveUpload}
          />
          {completedUploads.length > 0 && !uploading && (
            <div className="mt-4 pt-4 border-t flex justify-center gap-3">
              {hasFailedUploads && (
                <Button variant="outline" onClick={() => router.push('/documents')}>
                  View Uploaded
                </Button>
              )}
              <Button onClick={() => router.push('/documents')}>
                View All Documents
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="border rounded-lg p-6 bg-muted/20">
        <h3 className="font-medium mb-2">Upload Information</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Only PDF files are supported</li>
          <li>• Metadata (.md) files will be created automatically</li>
          <li>• Files are saved to the selected library folder</li>
          <li>• Category and tags can be edited later</li>
        </ul>
      </div>
    </div>
  );
}
