'use client';

import Link from 'next/link';
import { Star, Tag, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { DocumentListItem } from '@/lib/types';
import { formatFileSize } from '@/lib/utils/path';
import { format } from 'date-fns';

interface DocumentRowProps {
  document: DocumentListItem;
  className?: string;
}

export function DocumentRow({ document, className }: DocumentRowProps) {
  return (
    <tr
      className={cn(
        'group hover:bg-accent/50 transition-colors',
        className
      )}
    >
      {/* Title */}
      <td className="px-4 py-3">
        <Link
          href={`/documents/${document.id}`}
          className="flex items-center gap-3 hover:text-primary transition-colors"
        >
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{document.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {document.fileName}
            </p>
          </div>
        </Link>
      </td>

      {/* Author */}
      <td className="px-4 py-3">
        <span className="text-sm">{document.author || '-'}</span>
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        {document.category ? (
          <Badge variant="outline" className="text-xs">
            {document.category}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {document.tags.length > 0 ? (
            <>
              <Tag className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm">{document.tags.length}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      </td>

      {/* Rating */}
      <td className="px-4 py-3">
        {document.rating ? (
          <div className="flex items-center gap-0.5 text-yellow-500">
            {Array.from({ length: document.rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-current" />
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>

      {/* Date Added */}
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {document.dateAdded
            ? format(new Date(document.dateAdded), 'MMM d, yyyy')
            : '-'}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {formatFileSize(document.fileSize)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {document.readStatus && (
          <Badge
            variant={document.readStatus === 'read' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {document.readStatus}
          </Badge>
        )}
      </td>
    </tr>
  );
}
