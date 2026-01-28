'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface FileUploadProps {
  onUpload?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function UploadZone({
  onUpload,
  accept = '.pdf',
  multiple = false,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((file) => {
        if (accept) {
          const acceptedTypes = accept.split(',').map((type) => type.trim());
          return acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            return file.type.match(type);
          });
        }
        return true;
      });

      if (files.length > 0) {
        if (multiple) {
          setSelectedFiles((prev) => [...prev, ...files]);
        } else {
          setSelectedFiles([files[0]]);
        }
      }
    },
    [accept, multiple]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        if (multiple) {
          setSelectedFiles((prev) => [...prev, ...files]);
        } else {
          setSelectedFiles([files[0]]);
        }
      }
    },
    [multiple]
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0 && onUpload) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : disabled
            ? 'border-muted-foreground/10 opacity-50 cursor-not-allowed'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-1">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Accepts {accept || 'any file'}{multiple && ' (multiple allowed)'}
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Files:</p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={handleUpload} disabled={disabled} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
          </Button>
        </div>
      )}
    </div>
  );
}
