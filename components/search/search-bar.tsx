'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search documents...',
  defaultValue = '',
  onSearch,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue || searchParams.get('search') || '');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const handleSearch = useCallback(
    (value: string) => {
      if (onSearch) {
        onSearch(value);
      } else {
        // Update URL params
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set('search', value);
        } else {
          params.delete('search');
        }
        router.push(`?${params.toString()}`);
      }
    },
    [onSearch, searchParams, router]
  );

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  const handleClear = () => {
    setQuery('');
    handleSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex items-center w-full',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center w-full bg-background border rounded-lg transition-colors',
          isFocused ? 'border-ring' : 'border-input'
        )}
      >
        <Search className="w-4 h-4 ml-3 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
