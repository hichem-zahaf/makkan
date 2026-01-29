'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBar } from '@/components/search/search-bar';
import { SearchFilters } from '@/components/search/search-filters';
import { ViewToggle } from '@/components/documents/view-toggle';
import { DocumentCard } from '@/components/documents/document-card';
import { DocumentRow } from '@/components/documents/document-row';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Star,
  Trash2,
  Download,
  Tag as TagIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import type { Document, ViewMode, DocumentSort } from '@/lib/types';
import { getFileType } from '@/components/documents/file-icon';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<DocumentSort>({
    field: 'dateAdded',
    direction: 'desc',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  // Helper to update URL params
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`?${params.toString()}`);
  };

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Load documents
  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', limit.toString());
        params.set('sortField', sort.field);
        params.set('sortDirection', sort.direction);

        // Add filter params from URL
        const query = searchParams.get('query') || searchParams.get('search');
        const category = searchParams.get('category');
        const readStatus = searchParams.get('readStatus');
        const tags = searchParams.get('tags');
        const fileTypes = searchParams.get('fileTypes');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const isFavorite = searchParams.get('isFavorite');

        if (query) params.set('query', query);
        if (category) params.set('category', category);
        if (readStatus) params.set('readStatus', readStatus);
        if (tags) params.set('tags', tags);
        if (fileTypes) params.set('fileTypes', fileTypes);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (isFavorite === 'true') params.set('isFavorite', 'true');

        const res = await fetch(`/api/documents?${params}`);
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotal(data.pagination?.total || 0);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [page, sort, searchParams]);

  // Load filter options
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [catRes, tagRes, authRes] = await Promise.all([
          fetch('/api/documents/tags'),
          fetch('/api/documents/tags'),
          fetch('/api/documents/authors'),
        ]);

        // For now, extract from documents
        const uniqueCats = new Set<string>();
        const uniqueTags = new Set<string>();
        const uniqueAuthors = new Set<string>();

        documents.forEach((doc) => {
          if (doc.metadata.category) uniqueCats.add(doc.metadata.category);
          doc.metadata.tags.forEach((tag) => uniqueTags.add(tag));
          if (doc.metadata.author) uniqueAuthors.add(doc.metadata.author);
        });

        setCategories(Array.from(uniqueCats).sort());
        setTags(Array.from(uniqueTags).sort());
        setAuthors(Array.from(uniqueAuthors).sort());
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    }

    if (documents.length > 0) {
      loadFilterOptions();
    }
  }, [documents]);

  const totalPages = Math.ceil(total / limit);

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    setShowBatchActions(newSelection.size > 0);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBatchActions(false);
  };

  const selectAll = () => {
    setSelectedIds(new Set(documents.map((d) => d.id)));
    setShowBatchActions(true);
  };

  // Batch operations
  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} documents?`)) return;

    try {
      const res = await fetch('/api/documents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          documentIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted ${data.successCount} documents`);
        clearSelection();
        // Reload documents
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to delete documents');
    }
  };

  const handleBatchExport = async (format: 'json' | 'markdown') => {
    try {
      const res = await fetch('/api/documents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          documentIds: Array.from(selectedIds),
          options: { exportFormat: format },
        }),
      });

      if (format === 'json') {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents-export-${Date.now()}.json`;
        a.click();
        toast.success(`Exported ${data.count} documents`);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents-export-${Date.now()}.md`;
        a.click();
        toast.success('Exported documents as markdown');
      }
    } catch (error) {
      toast.error('Failed to export documents');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            {total} {total === 1 ? 'document' : 'documents'} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Favorites Filter */}
          <Button
            variant={searchParams.get('isFavorite') === 'true' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const currentValue = searchParams.get('isFavorite');
              updateUrlParams({ isFavorite: currentValue === 'true' ? null : 'true' });
            }}
          >
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </Button>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Batch Actions Bar */}
      {showBatchActions && (
        <div className="flex items-center justify-between p-4 bg-primary/10 border rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select all ({documents.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchExport('json')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchExport('markdown')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export MD
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchBar placeholder="Search documents..." />
        </div>
        <SearchFilters
          filters={{
            category: searchParams.get('category') || undefined,
            tags: searchParams.get('tags')?.split(',') || undefined,
            readStatus: (searchParams.get('readStatus') as 'unread' | 'reading' | 'read') || undefined,
          }}
          onFiltersChange={(filters) => {
            updateUrlParams({
              category: filters.category || null,
              tags: filters.tags ? filters.tags.join(',') : null,
              readStatus: filters.readStatus || null,
            });
          }}
          categories={categories}
          tags={tags.map(tag => ({ name: tag, count: 0 }))}
          authors={authors}
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select
          value={`${sort.field}-${sort.direction}`}
          onValueChange={(value) => {
            const [field, direction] = value.split('-') as [DocumentSort['field'], 'asc' | 'desc'];
            setSort({ field, direction });
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dateAdded-desc">Date Added (Newest)</SelectItem>
            <SelectItem value="dateAdded-asc">Date Added (Oldest)</SelectItem>
            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
            <SelectItem value="author-asc">Author (A-Z)</SelectItem>
            <SelectItem value="rating-desc">Rating (High-Low)</SelectItem>
            <SelectItem value="fileSize-desc">Size (Large-Small)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Documents Grid */}
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="relative">
                  {showBatchActions && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(doc.id)}
                        onChange={() => toggleSelection(doc.id)}
                        className="w-4 h-4 rounded border-input"
                      />
                    </div>
                  )}
                  <DocumentCard
                    document={{
                      id: doc.id,
                      fileName: doc.fileName,
                      filePath: doc.filePath,
                      fileSize: doc.fileSize,
                      title: doc.metadata.title,
                      author: doc.metadata.author,
                      category: doc.metadata.category,
                      tags: doc.metadata.tags,
                      readStatus: doc.metadata.readStatus,
                      rating: doc.metadata.rating,
                      dateAdded: doc.metadata.dateAdded,
                      isFavorite: doc.isFavorite || false,
                      project: doc.metadata.project,
                      language: doc.metadata.language,
                      fileType: doc.metadata.fileType || getFileType(doc.fileName),
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Documents Table */
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Author</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tags</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date Added</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      document={{
                        id: doc.id,
                        fileName: doc.fileName,
                        filePath: doc.filePath,
                        fileSize: doc.fileSize,
                        title: doc.metadata.title,
                        author: doc.metadata.author,
                        category: doc.metadata.category,
                        tags: doc.metadata.tags,
                        readStatus: doc.metadata.readStatus,
                        rating: doc.metadata.rating,
                        dateAdded: doc.metadata.dateAdded,
                        project: doc.metadata.project,
                        language: doc.metadata.language,
                        fileType: doc.metadata.fileType || getFileType(doc.fileName),
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {documents.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchParams.toString()
                  ? 'Try adjusting your search or filters'
                  : 'Configure a library to get started'}
              </p>
              {!searchParams.toString() && (
                <Button asChild>
                  <a href="/settings">Configure Library</a>
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * limit + 1, total)} to{' '}
                {Math.min(page * limit, total)} of {total} documents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
