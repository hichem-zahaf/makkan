'use client';

import Link from 'next/link';
import { Star, User, BookOpen, Copy, ExternalLink, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { DocumentListItem } from '@/lib/types';
import { formatFileSize } from '@/lib/utils/path';
import { FileIcon, getFileType, isPreviewable, type FileType } from './file-icon';
import { toast } from 'sonner';
import { useState } from 'react';

interface DocumentCardProps {
  document: DocumentListItem;
  className?: string;
}

const statusColors = {
  unread: 'bg-gray-300',
  reading: 'bg-yellow-500',
  read: 'bg-green-500',
};

export function DocumentCard({ document, className }: DocumentCardProps) {
  const [copied, setCopied] = useState(false);
  const fileType = (document.fileType || getFileType(document.fileName)) as FileType;
  const canPreview = isPreviewable(fileType);

  const handleCopyPath = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(document.filePath);
    setCopied(true);
    toast.success('File path copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // For local files, we can't directly open them from browser
    // But we can show the path in a toast
    toast.info(`File location: ${document.filePath}`);
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-lg border bg-card card-hover fade-in',
        'hover:border-primary/50 transition-all duration-200',
        className
      )}
    >
      <Link
        href={`/documents/${document.id}`}
        className="block"
      >
        {/* Favorite Badge */}
        {document.isFavorite && (
          <div className="absolute top-3 right-3 z-10">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
          </div>
        )}

        {/* Read Status Indicator */}
        {document.readStatus && (
          <div
            className={cn(
              'absolute top-3 left-3 w-2 h-2 rounded-full',
              statusColors[document.readStatus]
            )}
          />
        )}

        {/* Document Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
          <FileIcon fileType={fileType} />
        </div>

        {/* Header */}
        <div className="mb-3">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {document.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {document.fileName}
          </p>
        </div>

        {/* Tags */}
        {document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {document.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs hover:bg-secondary/70 transition-colors"
              >
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{document.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Project Badge */}
        {document.project && (
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="outline" className="text-xs">
              <FolderOpen className="w-3 h-3 mr-1" />
              {document.project}
            </Badge>
          </div>
        )}

        {/* Language Badge */}
        {document.language && (
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="outline" className="text-xs">
              {document.language}
            </Badge>
          </div>
        )}

        {/* Rating */}
        {document.rating && (
          <div className="flex items-center gap-0.5 text-yellow-500 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-3.5 h-3.5 transition-transform hover:scale-110',
                  i < document.rating! ? 'fill-current' : 'text-gray-300'
                )}
              />
            ))}
          </div>
        )}

        {/* File Path Actions */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex-1 text-xs text-muted-foreground truncate bg-muted/50 px-2 py-1 rounded">
            {document.filePath}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopyPath}
            title="Copy path"
          >
            <Copy className={cn('w-3 h-3', copied && 'text-green-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleOpenFile}
            title="Show file location"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <div className="flex items-center gap-3">
            {document.author && (
              <span className="flex items-center gap-1 hover:text-foreground transition-colors">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{document.author}</span>
              </span>
            )}
            <span className="hover:text-foreground transition-colors">
              {formatFileSize(document.fileSize)}
            </span>
          </div>
          {document.category && (
            <Badge
              variant="outline"
              className="text-xs hover:bg-accent transition-colors"
            >
              {document.category}
            </Badge>
          )}
        </div>

        {/* Preview Badge */}
        {!canPreview && (
          <div className="absolute top-3 right-12">
            <Badge variant="outline" className="text-xs">
              No preview
            </Badge>
          </div>
        )}

        {/* Read Status Badge */}
        {document.readStatus && document.readStatus !== 'unread' && (
          <div className="absolute bottom-3 right-3">
            {document.readStatus === 'reading' && (
              <Badge variant="secondary" className="text-xs gap-1">
                <BookOpen className="w-3 h-3" />
                Reading
              </Badge>
            )}
            {document.readStatus === 'read' && (
              <Badge variant="default" className="text-xs">
                Read
              </Badge>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}
