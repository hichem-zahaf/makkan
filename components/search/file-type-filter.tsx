'use client';

import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { FileIcon, type FileType } from '@/components/documents/file-icon';
export type { FileType } from '@/components/documents/file-icon';

export interface FileTypeOption {
  type: FileType | 'all';
  label: string;
  count?: number;
}

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  { type: 'all', label: 'All' },
  { type: 'pdf', label: 'PDFs' },
  { type: 'image', label: 'Images' },
  { type: 'video', label: 'Videos' },
  { type: 'audio', label: 'Audio' },
  { type: 'document', label: 'Documents' },
  { type: 'text', label: 'Text' },
  { type: 'code', label: 'Code' },
  { type: 'archive', label: 'Archives' },
];

interface FileTypeFilterProps {
  selectedTypes: FileType[];
  onTypeToggle: (type: FileType) => void;
  onClearAll: () => void;
  counts?: Partial<Record<FileType, number>>;
  className?: string;
}

export function FileTypeFilter({
  selectedTypes,
  onTypeToggle,
  onClearAll,
  counts,
  className,
}: FileTypeFilterProps) {
  const hasSelection = selectedTypes.length > 0;

  const handleToggle = (type: FileType | 'all') => {
    if (type === 'all') {
      onClearAll();
    } else {
      onTypeToggle(type);
    }
  };

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent', className)}>
      {FILE_TYPE_OPTIONS.map((option) => {
        const isSelected = option.type === 'all'
          ? selectedTypes.length === 0
          : selectedTypes.includes(option.type as FileType);

        const count = option.type !== 'all' ? counts?.[option.type as FileType] : undefined;

        return (
          <Badge
            key={option.type}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer whitespace-nowrap transition-colors hover:bg-primary/80',
              'flex items-center gap-1.5 px-3 py-1.5'
            )}
            onClick={() => handleToggle(option.type)}
          >
            {option.type !== 'all' && (
              <FileIcon fileType={option.type as FileType} className="w-3 h-3" />
            )}
            <span>{option.label}</span>
            {count !== undefined && (
              <span className="text-xs opacity-60">({count})</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}
