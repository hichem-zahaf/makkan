'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';

export type DatePreset = 'all' | 'today' | '7days' | '30days' | 'year';

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: 'year', label: 'Last year' },
];

interface DateRangeFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange: (from?: string, to?: string) => void;
  className?: string;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateRangeChange,
  className,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasFilter = !!dateFrom || !!dateTo;

  const handlePreset = (preset: DatePreset) => {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (preset) {
      case 'all':
        from = undefined;
        to = undefined;
        break;
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case '7days':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = new Date();
        break;
      case '30days':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = new Date();
        break;
      case 'year':
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        to = new Date();
        break;
    }

    onDateRangeChange(
      from?.toISOString(),
      to?.toISOString()
    );
  };

  const handleClear = () => {
    onDateRangeChange(undefined, undefined);
  };

  const formatDateRange = () => {
    if (!dateFrom && !dateTo) return 'All time';
    if (dateFrom && dateTo) {
      return `${format(new Date(dateFrom), 'MMM d')} - ${format(new Date(dateTo), 'MMM d, yyyy')}`;
    }
    if (dateFrom) return `Since ${format(new Date(dateFrom), 'MMM d, yyyy')}`;
    if (dateTo) return `Until ${format(new Date(dateTo), 'MMM d, yyyy')}`;
    return 'All time';
  };

  return (
    <div className={cn('relative', className)}>
      <Badge
        variant={hasFilter ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer px-3 py-1.5 transition-colors hover:bg-primary/80',
          'flex items-center gap-2'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="w-3 h-3" />
        <span>{formatDateRange()}</span>
        {hasFilter && (
          <X
            className="w-3 h-3 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </Badge>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="flex flex-col gap-1">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  handlePreset(preset.value);
                  setIsOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
