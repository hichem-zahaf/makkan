'use client';

import { useState } from 'react';
import { Bookmark, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { SavedSearch, DocumentFilter } from '@/lib/types';

interface SavedSearchesProps {
  savedSearches?: SavedSearch[];
  currentQuery?: string;
  currentFilters?: DocumentFilter;
  onSave?: (name: string) => void;
  onLoad?: (savedSearch: SavedSearch) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function SavedSearches({
  savedSearches = [],
  currentQuery = '',
  currentFilters = {},
  onSave,
  onLoad,
  onDelete,
  className,
}: SavedSearchesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  const handleSave = () => {
    if (searchName.trim() && onSave) {
      onSave(searchName.trim());
      setSearchName('');
      setSaveDialogOpen(false);
    }
  };

  const hasActiveSearch = currentQuery || Object.keys(currentFilters).length > 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Save Search Button */}
      {hasActiveSearch && onSave && (
        <>
          <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
            <Bookmark className="w-4 h-4 mr-2" />
            Save Search
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Search</DialogTitle>
                <DialogDescription>
                  Give this search a name to save it for later.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Search name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!searchName.trim()}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Saved Searches Dropdown */}
      {savedSearches.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Saved Searches
          </Button>

          {isOpen && (
            <div className="absolute top-full mt-2 right-0 z-50 w-80 bg-background border rounded-lg shadow-lg">
              <div className="max-h-96 overflow-y-auto">
                {savedSearches.map((savedSearch) => (
                  <div
                    key={savedSearch.id}
                    className="flex items-center gap-2 p-3 hover:bg-accent border-b last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{savedSearch.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {savedSearch.query}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onLoad && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            onLoad(savedSearch);
                            setIsOpen(false);
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDelete(savedSearch.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
