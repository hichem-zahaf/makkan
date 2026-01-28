'use client';

import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { ViewMode } from '@/lib/types';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center border rounded-lg p-1', className)}>
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className="h-7 px-2"
      >
        <Grid className="w-4 h-4" />
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="h-7 px-2"
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}
