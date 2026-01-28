'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { DocumentFilter, ReadStatus } from '@/lib/types';

interface SearchFiltersProps {
  filters: DocumentFilter;
  onFiltersChange: (filters: DocumentFilter) => void;
  categories?: string[];
  tags?: string[];
  authors?: string[];
  className?: string;
}

export function SearchFilters({
  filters,
  onFiltersChange,
  categories = [],
  tags = [],
  authors = [],
  className,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.category,
    filters.readStatus,
    filters.author,
    filters.rating,
    ...(filters.tags || []),
  ].filter(Boolean).length;

  const updateFilter = (key: keyof DocumentFilter, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof DocumentFilter) => {
    onFiltersChange({ ...filters, [key]: undefined });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {activeFilterCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-80 bg-background border rounded-lg shadow-lg p-4 space-y-4">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category || ''}
                onValueChange={(value) =>
                  updateFilter('category', value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.category && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('category')}
                  className="h-6 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Tags Filter */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map((tag) => {
                  const isSelected = filters.tags?.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const currentTags = filters.tags || [];
                        const newTags = isSelected
                          ? currentTags.filter((t) => t !== tag)
                          : [...currentTags, tag];
                        updateFilter('tags', newTags.length > 0 ? newTags : undefined);
                      }}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
              {filters.tags && filters.tags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('tags')}
                  className="h-6 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear tags
                </Button>
              )}
            </div>
          )}

          {/* Author Filter */}
          {authors.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Author</label>
              <Select
                value={filters.author || ''}
                onValueChange={(value) =>
                  updateFilter('author', value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Authors</SelectItem>
                  {authors.map((author) => (
                    <SelectItem key={author} value={author}>
                      {author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.author && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('author')}
                  className="h-6 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Read Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Read Status</label>
            <Select
              value={filters.readStatus || ''}
              onValueChange={(value) =>
                updateFilter('readStatus', value === '' ? undefined : (value as ReadStatus))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            {filters.readStatus && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('readStatus')}
                className="h-6 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Minimum Rating Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Rating</label>
            <Select
              value={filters.rating?.toString() || ''}
              onValueChange={(value) =>
                updateFilter('rating', value === '' ? undefined : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Rating</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="2">2+ Stars</SelectItem>
                <SelectItem value="1">1+ Stars</SelectItem>
              </SelectContent>
            </Select>
            {filters.rating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('rating')}
                className="h-6 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="w-full"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
