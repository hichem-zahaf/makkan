'use client';

import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';

export interface TagCount {
  name: string;
  count: number;
}

interface TagPillsProps {
  tags: TagCount[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  className?: string;
}

export function TagPills({ tags, selectedTags, onTagToggle, className }: TagPillsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent', className)}>
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag.name);
        return (
          <Badge
            key={tag.name}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer whitespace-nowrap transition-colors hover:bg-primary/80',
              'flex items-center gap-1.5 px-3 py-1.5'
            )}
            onClick={() => onTagToggle(tag.name)}
          >
            <span>{tag.name}</span>
            <span className={cn(
              'text-xs opacity-60',
              isSelected && 'opacity-80'
            )}>
              ({tag.count})
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
