'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, ExternalLink, Trash2, Star, Copy, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { Document as DocumentType } from '@/lib/types';
import { formatFileSize } from '@/lib/utils/path';
import { format as formatDate } from 'date-fns';
import { toast } from 'sonner';
import { FileViewer } from '@/components/documents/file-viewer';

export function DocumentMetadata({ document }: { document: DocumentType }) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(document.metadata.customFields?.isFavorite === true);
  const [showFileInfo, setShowFileInfo] = useState(false);

  const handleToggleFavorite = async () => {
    try {
      const res = await fetch(`/api/documents/${document.id}/favorite`, { method: 'POST' });
      const data = await res.json();
      setIsFavorite(data.isFavorite);
      toast.success(data.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      toast.error('Failed to toggle favorite');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
      toast.success('Document deleted');
      router.push('/documents');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleDuplicate = async () => {
    const newTitle = prompt('Enter title for the duplicate:', `${document.metadata.title} (Copy)`);
    if (!newTitle) return;

    try {
      const res = await fetch(`/api/documents/${document.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle }),
      });
      if (res.ok) {
        toast.success('Document duplicated successfully. Refresh your library to see it.');
      }
    } catch (error) {
      toast.error('Failed to duplicate document');
    }
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    try {
      const res = await fetch(`/api/documents/${document.id}/export?format=${format}`);
      if (format === 'json') {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.metadata.title}.json`;
        a.click();
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.metadata.title}.md`;
        a.click();
      }
      toast.success('Exported successfully');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{document.metadata.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{document.fileName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleFavorite}
          className={isFavorite ? 'text-yellow-500' : ''}
        >
          <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Rating */}
      {document.metadata.rating && (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'w-5 h-5',
                i < document.metadata.rating! ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
              )}
            />
          ))}
        </div>
      )}

      {/* Author */}
      {document.metadata.author && (
        <div>
          <p className="text-sm text-muted-foreground">Author</p>
          <p className="font-medium">{document.metadata.author}</p>
        </div>
      )}

      {/* Category */}
      {document.metadata.category && (
        <div>
          <p className="text-sm text-muted-foreground">Category</p>
          <Badge variant="secondary">{document.metadata.category}</Badge>
        </div>
      )}

      {/* Tags */}
      {document.metadata.tags.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {document.metadata.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {document.metadata.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="text-sm mt-1 whitespace-pre-wrap">{document.metadata.notes}</p>
        </div>
      )}

      {/* File Info - Expandable */}
      <div className="pt-4 border-t">
        <button
          onClick={() => setShowFileInfo(!showFileInfo)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <Info className="w-4 h-4" />
          {showFileInfo ? 'Hide' : 'Show'} File Information
        </button>
        {showFileInfo && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">File Name:</span>
              </div>
              <div className="text-right">{document.fileName}</div>
              <div>
                <span className="text-muted-foreground">File Size:</span>
              </div>
              <div className="text-right">{formatFileSize(document.fileSize)}</div>
              <div>
                <span className="text-muted-foreground">File Path:</span>
              </div>
              <div className="text-right text-xs truncate" title={document.filePath}>
                {document.filePath}
              </div>
              <div>
                <span className="text-muted-foreground">Date Added:</span>
              </div>
              <div className="text-right">
                {document.createdAt
                  ? formatDate(new Date(document.createdAt), 'MMM d, yyyy')
                  : 'Unknown'}
              </div>
              <div>
                <span className="text-muted-foreground">Date Modified:</span>
              </div>
              <div className="text-right">
                {document.updatedAt
                  ? formatDate(new Date(document.updatedAt), 'MMM d, yyyy')
                  : 'Unknown'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.push(`/documents/${document.id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Metadata
        </Button>
        <Button variant="outline" onClick={handleDuplicate}>
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </Button>
        <Button variant="outline" onClick={() => handleExport('json')}>
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
        <Button variant="outline" onClick={() => handleExport('markdown')}>
          <Download className="w-4 h-4 mr-2" />
          Export MD
        </Button>
        <Button variant="outline" onClick={handleDelete} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/files/${document.id}/pdf`} target="_blank" rel="noopener">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open File
          </a>
        </Button>
      </div>
    </div>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`/api/documents/${params.id}`);
        if (!res.ok) {
          throw new Error('Document not found');
        }
        const data = await res.json();
        setDocument(data);

        // Mark as read when document is opened
        if (data.metadata.readStatus !== 'read') {
          try {
            await fetch(`/api/documents/${params.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ readStatus: 'read' }),
            });
          } catch (err) {
            console.warn('Failed to mark document as read:', err);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [params.id]);

  if (loading) {
    return <DocumentLoading />;
  }

  if (error || !document) {
    return <DocumentError message={error || 'Document not found'} />;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* File Viewer */}
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <FileViewer document={document} />
        </div>

        {/* Metadata Sidebar */}
        <div className="border rounded-lg p-6 overflow-y-auto">
          <DocumentMetadata document={document} />
        </div>
      </div>
    </div>
  );
}

// Helper components
function DocumentLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    </div>
  );
}

function DocumentError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-lg font-medium text-destructive mb-2">Error</p>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Re-export for convenience
export { DocumentLoading, DocumentError };
