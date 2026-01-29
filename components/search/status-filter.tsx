'use client';

import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import type { ReadStatus } from '@/lib/types';

export interface StatusOption {
  value: ReadStatus | 'all';
  label: string;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All', color: 'bg-gray-400' },
  { value: 'unread', label: 'Unread', color: 'bg-gray-300' },
  { value: 'reading', label: 'Reading', color: 'bg-yellow-500' },
  { value: 'read', label: 'Read', color: 'bg-green-500' },
];

interface StatusFilterProps {
  selectedStatus: ReadStatus | undefined;
  onStatusChange: (status: ReadStatus | undefined) => void;
  className?: string;
}

export function StatusFilter({
  selectedStatus,
  onStatusChange,
  className,
}: StatusFilterProps) {
  const handleStatusClick = (value: ReadStatus | 'all') => {
    if (value === 'all') {
      onStatusChange(undefined);
    } else {
      onStatusChange(value);
    }
  };

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent', className)}>
      {STATUS_OPTIONS.map((option) => {
        const isSelected = option.value === 'all'
          ? !selectedStatus
          : selectedStatus === option.value;

        return (
          <Badge
            key={option.value}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer whitespace-nowrap transition-colors hover:bg-primary/80',
              'flex items-center gap-2 px-3 py-1.5'
            )}
            onClick={() => handleStatusClick(option.value)}
          >
            {option.value !== 'all' && (
              <span className={cn('w-2 h-2 rounded-full', option.color)} />
            )}
            <span>{option.label}</span>
          </Badge>
        );
      })}
    </div>
  );
}
