'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, User, BookOpen, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { DocumentListItem } from '@/lib/types';
import { formatFileSize } from '@/lib/utils/path';
import { FileIcon, getFileType, isPreviewable, type FileType } from './file-icon';
import { toast } from 'sonner';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const fileType = (document.fileType || getFileType(document.fileName)) as FileType;
  const canPreview = isPreviewable(fileType);
  const extension = document.fileName.split('.').pop()?.toLowerCase() || '';

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
    toast.info(`File location: ${document.filePath}`);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Trim helper
  const trimText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card card-hover fade-in transition-all duration-200',
        isExpanded ? 'h-[400px] p-4' : 'h-[100px] p-3',
        'hover:border-primary/50',
        className
      )}
    >
      <Link
        href={`/documents/${document.id}`}
        className="flex flex-col flex-1 overflow-hidden"
      >
        {/* Minimal View Header (always visible) */}
        <div className="flex items-start gap-3">
          {/* Document Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/20 transition-colors">
            <FileIcon fileType={fileType} extension={extension} className="scale-75" />
          </div>

          {/* Minimal Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Title */}
              <h3
                className="font-medium text-sm truncate"
                title={document.title}
              >
                {trimText(document.title, 40)}
              </h3>
              {/* Read Status Indicator */}
              {document.readStatus && (
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    statusColors[document.readStatus]
                  )}
                  title={document.readStatus}
                />
              )}
            </div>

            {/* File Info Row */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {/* File name trimmed */}
              <span className="truncate" title={document.fileName}>
                {trimText(document.fileName, 20)}
              </span>
              <span>•</span>
              {/* File size */}
              <span>{formatFileSize(document.fileSize)}</span>
              <span>•</span>
              {/* File path trimmed */}
              <span className="truncate" title={document.filePath}>
                {trimText(document.filePath, 25)}
              </span>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Favorite Badge */}
            {document.isFavorite && (
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500 shrink-0" />
            )}

            {/* Preview Badge */}
            {!canPreview && (
              <Badge variant="outline" className="text-xs shrink-0">
                No preview
              </Badge>
            )}

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={toggleExpand}
              title={isExpanded ? 'Show less' : 'Show more'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="flex-1 flex flex-col overflow-hidden mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
            {/* Tags */}
            {document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.slice(0, 5).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs hover:bg-secondary/70 transition-colors"
                  >
                    {tag}
                  </Badge>
                ))}
                {document.tags.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{document.tags.length - 5}
                  </Badge>
                )}
              </div>
            )}

            {/* Project Badge */}
            {document.project && (
              <Badge variant="outline" className="text-xs w-fit">
                📁 {document.project}
              </Badge>
            )}

            {/* Language Badge */}
            {document.language && (
              <Badge variant="outline" className="text-xs w-fit">
                {document.language}
              </Badge>
            )}

            {/* Rating */}
            {document.rating && (
              <div className="flex items-center gap-0.5 text-yellow-500">
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

            {/* Author */}
            {document.author && (
              <div className="flex items-center gap-1 text-xs">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="truncate" title={document.author}>
                  {trimText(document.author, 30)}
                </span>
              </div>
            )}

            {/* Category */}
            {document.category && (
              <Badge variant="outline" className="text-xs w-fit hover:bg-accent transition-colors">
                {document.category}
              </Badge>
            )}

            {/* File Path Actions */}
            <div className="flex items-center gap-1 pt-2 border-t mt-auto">
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

            {/* Read Status Badge */}
            {document.readStatus && document.readStatus !== 'unread' && (
              <Badge
                variant={document.readStatus === 'read' ? 'default' : 'secondary'}
                className="text-xs gap-1 w-fit"
              >
                <BookOpen className="w-3 h-3" />
                {document.readStatus === 'reading' ? 'Reading' : 'Read'}
              </Badge>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}
