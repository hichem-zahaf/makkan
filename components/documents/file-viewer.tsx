'use client';

import { useState, useEffect } from 'react';
import { FileText, Image, Video, Music, FileCode, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Document as DocumentType } from '@/lib/types';
import { getFileType, type FileType } from './file-icon';

interface FileViewerProps {
  document: DocumentType;
}

// Code file extensions for syntax highlighting
const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs',
  'php', 'rb', 'swift', 'kt', 'scala', 'html', 'css', 'scss', 'json', 'xml',
  'yaml', 'yml', 'toml', 'ini', 'sql', 'sh', 'bash', 'zsh', 'ps1', 'dockerfile',
]);

export function FileViewer({ document }: FileViewerProps) {
  const fileType = (document.metadata.fileType || getFileType(document.fileName)) as FileType;
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For code/text files, try to fetch content
  useEffect(() => {
    if ((fileType === 'code' || fileType === 'text') && !content) {
      setLoading(true);
      fetch(`/api/files/${document.id}/content`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load file content');
          return res.text();
        })
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load file');
          setLoading(false);
        });
    }
  }, [document.id, fileType, content]);

  // Get file extension
  const extension = document.fileName.split('.').pop()?.toLowerCase() || '';

  // Render based on file type
  switch (fileType) {
    case 'pdf':
      return <PDFViewer document={document} />;

    case 'image':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-sm font-medium">{document.fileName}</span>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/files/${document.id}/pdf`} target="_blank" rel="noopener">
                Open in new tab
              </a>
            </Button>
          </div>
          <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
            <img
              src={`/api/files/${document.id}/pdf`}
              alt={document.fileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      );

    case 'video':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-sm font-medium">{document.fileName}</span>
          </div>
          <div className="flex-1 overflow-auto bg-black flex items-center justify-center">
            <video
              src={`/api/files/${document.id}/pdf`}
              controls
              className="max-w-full max-h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      );

    case 'audio':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              <span className="text-sm font-medium">{document.fileName}</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <audio
              src={`/api/files/${document.id}/pdf`}
              controls
              className="w-full max-w-lg"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      );

    case 'code':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">{document.fileName}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {extension.toUpperCase()}
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/files/${document.id}/pdf`} target="_blank" rel="noopener">
                Download
              </a>
            </Button>
          </div>
          <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            ) : (
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                <code>{content}</code>
              </pre>
            )}
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium">{document.fileName}</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/files/${document.id}/pdf`} target="_blank" rel="noopener">
                Download
              </a>
            </Button>
          </div>
          <div className="flex-1 overflow-auto bg-muted/30 p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {content}
              </pre>
            )}
          </div>
        </div>
      );

    case 'document':
      // For office documents, show a message that they need to be downloaded
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">{document.fileName}</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                This document type cannot be previewed in the browser.
              </p>
              <Button variant="outline" asChild>
                <a href={`/api/files/${document.id}/pdf`} download>
                  Download to view
                </a>
              </Button>
            </div>
          </div>
        </div>
      );

    case 'archive':
    case 'unknown':
    default:
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <File className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{document.fileName}</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No preview available</p>
              <p className="text-sm text-muted-foreground mb-4">
                This file type cannot be previewed.
              </p>
              <Button variant="outline" asChild>
                <a href={`/api/files/${document.id}/pdf`} download>
                  Download file
                </a>
              </Button>
            </div>
          </div>
        </div>
      );
  }
}

// PDF Viewer component (existing)
function PDFViewer({ document }: { document: DocumentType }) {
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
          <iframe
            src={`/api/files/${document.id}/pdf`}
            className="border-0"
            style={{
              width: '800px',
              height: '1131px',
            }}
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              try {
                const pdfApp = (iframe.contentWindow as any)?.PDFViewerApplication;
                const pdf = pdfApp?.pdfDocument;
                if (pdf) {
                  pdf.getPageCount().then((count: number) => setPageCount(count));
                }
              } catch {
                setPageCount(1);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
