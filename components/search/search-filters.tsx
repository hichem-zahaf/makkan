'use client';

import { useState } from 'react';
import { X, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { DocumentFilter, ReadStatus } from '@/lib/types';
import { TagPills } from './tag-pills';
import { FileTypeFilter, type FileType } from './file-type-filter';
import { DateRangeFilter } from './date-range-filter';
import { StatusFilter } from './status-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchFiltersProps {
  filters: DocumentFilter;
  onFiltersChange: (filters: DocumentFilter) => void;
  categories?: string[];
  tags?: Array<{ name: string; count: number }>;
  authors?: string[];
  fileTypeCounts?: Partial<Record<FileType, number>>;
  className?: string;
}

export function SearchFilters({
  filters,
  onFiltersChange,
  categories = [],
  tags = [],
  authors = [],
  fileTypeCounts,
  className,
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = [
    filters.category,
    filters.readStatus,
    filters.author,
    filters.rating,
    filters.fileTypes?.length,
    filters.tags?.length,
    filters.dateFrom || filters.dateTo,
  ].filter(Boolean).length;

  const updateFilter = (key: keyof DocumentFilter, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateFilter('tags', newTags.length > 0 ? newTags : undefined);
  };

  const handleFileTypeToggle = (type: FileType) => {
    const currentTypes = filters.fileTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    updateFilter('fileTypes', newTypes.length > 0 ? newTypes : undefined);
  };

  const handleFileTypeClearAll = () => {
    updateFilter('fileTypes', undefined);
  };

  const handleDateRangeChange = (from?: string, to?: string) => {
    updateFilter('dateFrom', from);
    updateFilter('dateTo', to);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Quick Filters Bar */}
      <div className="flex flex-col gap-4">
        {/* Search Input with Filter Toggle */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="search"
              placeholder="Search documents..."
              value={filters.query || ''}
              onChange={(e) => updateFilter('query', e.target.value || undefined)}
              className="w-full"
            />
            {(filters.query || activeFilterCount > 0) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={clearAllFilters}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'shrink-0',
              activeFilterCount > 0 && 'bg-primary/10 border-primary/50'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Quick Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status Filter */}
          <StatusFilter
            selectedStatus={filters.readStatus}
            onStatusChange={(status) => updateFilter('readStatus', status)}
          />

          {/* File Type Filter */}
          <FileTypeFilter
            selectedTypes={(filters.fileTypes || []) as FileType[]}
            onTypeToggle={handleFileTypeToggle}
            onClearAll={handleFileTypeClearAll}
            counts={fileTypeCounts}
          />

          {/* Date Range Filter */}
          <DateRangeFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Tag Pills */}
        {tags.length > 0 && (
          <TagPills
            tags={tags}
            selectedTags={filters.tags || []}
            onTagToggle={handleTagToggle}
          />
        )}
      </div>

      {/* Advanced Filters Dropdown */}
      {showAdvanced && (
        <div className="border rounded-lg p-4 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Advanced Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(false)}
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <SelectValue placeholder="All Categories" />
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
                    <SelectValue placeholder="All Authors" />
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
              </div>
            )}

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Rating</label>
              <Select
                value={filters.rating?.toString() || ''}
                onValueChange={(value) =>
                  updateFilter('rating', value === '' ? undefined : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Rating" />
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
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
