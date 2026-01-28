'use client';

import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/cn';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadProgressListProps {
  uploads: UploadProgress[];
  onRemove?: (index: number) => void;
  className?: string;
}

export function UploadProgressList({
  uploads,
  onRemove,
  className,
}: UploadProgressListProps) {
  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {uploads.map((upload, index) => (
        <div
          key={index}
          className="p-4 border rounded-lg bg-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium truncate">
                  {upload.file.name}
                </p>
                {upload.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {(upload.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {upload.error && (
                <p className="text-xs text-red-600 mt-1">{upload.error}</p>
              )}
            </div>
            {upload.status !== 'uploading' && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {upload.status === 'uploading' && (
            <Progress value={upload.progress} className="mt-3" />
          )}
        </div>
      ))}
    </div>
  );
}
