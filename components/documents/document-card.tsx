'use client';

import Link from 'next/link';
import { FileText, Star, Tag, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { DocumentListItem } from '@/lib/types';
import { formatFileSize } from '@/lib/utils/path';

interface DocumentCardProps {
  document: DocumentListItem;
  className?: string;
}

export function DocumentCard({ document, className }: DocumentCardProps) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className={cn(
        'group block p-4 rounded-lg border bg-card hover:shadow-md transition-all',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {document.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {document.fileName}
          </p>
        </div>
        {document.rating && (
          <div className="flex items-center gap-0.5 text-yellow-500">
            {Array.from({ length: document.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      {document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {document.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
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

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {document.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {document.author}
            </span>
          )}
          <span>{formatFileSize(document.fileSize)}</span>
        </div>
        {document.category && (
          <Badge variant="outline" className="text-xs">
            {document.category}
          </Badge>
        )}
      </div>

      {/* Read Status Indicator */}
      {document.readStatus && (
        <div
          className={cn(
            'absolute top-2 right-2 w-2 h-2 rounded-full',
            document.readStatus === 'read' && 'bg-green-500',
            document.readStatus === 'reading' && 'bg-yellow-500',
            document.readStatus === 'unread' && 'bg-gray-300'
          )}
        />
      )}
    </Link>
  );
}
