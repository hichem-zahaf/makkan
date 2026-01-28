'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, ExternalLink, Trash2, Star, Copy, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Document as DocumentType } from '@/lib/types';
import { formatFileSize } from '@/lib/utils/path';
import { format as formatDate } from 'date-fns';
import { toast } from 'sonner';

export function PDFViewer({ document }: { document: DocumentType }) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);

  return (
    <div className="flex flex-col h-full">
      {/* PDF Viewer Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {pageCount || '...'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount}
          >
            Next
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            Zoom Out
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
          >
            Zoom In
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
        <div
          className="bg-white shadow-lg"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        >
          {/* Using iframe for PDF - simpler than react-pdf for now */}
          <iframe
            src={`/api/files/${document.id}/pdf`}
            className="border-0"
            style={{
              width: '800px',
              height: '1131px', // A4 ratio at 96 DPI
            }}
            onLoad={(e) => {
              // Try to get page count from PDF
              const iframe = e.target as HTMLIFrameElement;
              try {
                const pdfApp = (iframe.contentWindow as any)?.PDFViewerApplication;
                const pdf = pdfApp?.pdfDocument;
                if (pdf) {
                  pdf.getPageCount().then((count: number) => setPageCount(count));
                }
              } catch {
                // PDF.js not available, use placeholder
                setPageCount(1);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

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

      {/* File Info */}
      <div className="pt-4 border-t space-y-2">
        <p className="text-sm text-muted-foreground">File Information</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Size: </span>
            {formatFileSize(document.fileSize)}
          </div>
          <div>
            <span className="text-muted-foreground">Added: </span>
            {document.createdAt
              ? formatDate(new Date(document.createdAt), 'MMM d, yyyy')
              : 'Unknown'}
          </div>
          <div>
            <span className="text-muted-foreground">Modified: </span>
            {document.updatedAt
              ? formatDate(new Date(document.updatedAt), 'MMM d, yyyy')
              : 'Unknown'}
          </div>
        </div>
      </div>

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
            Open PDF
          </a>
        </Button>
      </div>
    </div>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
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
        {/* PDF Viewer */}
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <PDFViewer document={document} />
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
import { cn } from '@/lib/utils/cn';

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
