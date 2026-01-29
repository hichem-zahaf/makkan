'use client';

import { useState } from 'react';
import { FolderOpen, Trash2, RefreshCw, FileText, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { formatFileSize } from '@/lib/utils/path';
import type { Library } from '@/lib/types';

interface LibraryCardProps {
  library: Library;
  documentCount: number;
  librarySize: number;
  isScanning: boolean;
  scanProgress?: { processed: number; total: number; current?: string };
  onScan: () => void;
  onRemove: () => void;
  className?: string;
}

export function LibraryCard({
  library,
  documentCount,
  librarySize,
  isScanning,
  scanProgress,
  onScan,
  onRemove,
  className,
}: LibraryCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    if (!confirm(`Are you sure you want to remove "${library.name}"? This will delete ${documentCount} document(s).`)) {
      return;
    }
    setIsRemoving(true);
    onRemove();
  };

  const getScanPercentage = () => {
    if (!scanProgress || scanProgress.total === 0) return 0;
    return Math.round((scanProgress.processed / scanProgress.total) * 100);
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border bg-card transition-all',
        'hover:border-primary/50 hover:shadow-md',
        isScanning && 'border-primary/50 bg-primary/5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{library.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{library.path}</p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onScan}
            disabled={isScanning}
            title="Scan library"
          >
            <RefreshCw className={cn('w-4 h-4', isScanning && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemove}
            disabled={isScanning || isRemoving}
            title="Remove library"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>{documentCount} documents</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          <span>{formatFileSize(librarySize)}</span>
        </div>
        <Badge variant="outline" className="ml-auto">
          {library.organization}
        </Badge>
      </div>

      {/* Scan Progress */}
      {isScanning && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {scanProgress ? `Scanning: ${scanProgress.current || 'Processing...'}` : 'Scanning...'}
            </span>
            <span className="font-medium">{getScanPercentage()}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${getScanPercentage()}%` }}
            />
          </div>
          {scanProgress && (
            <div className="text-xs text-muted-foreground text-center">
              {scanProgress.processed} / {scanProgress.total} files
            </div>
          )}
        </div>
      )}

      {/* Status Indicator */}
      {!isScanning && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 rounded-full bg-green-500" title="Up to date" />
        </div>
      )}
    </div>
  );
}
