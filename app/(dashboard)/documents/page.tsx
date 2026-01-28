'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Document, ViewMode, DocumentSort } from '@/lib/types';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
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
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const readStatus = searchParams.get('readStatus');
        const tags = searchParams.get('tags');

        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (readStatus) params.set('readStatus', readStatus);
        if (tags) params.set('tags', tags);

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
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

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
            const params = new URLSearchParams();
            if (filters.category) params.set('category', filters.category);
            if (filters.tags) params.set('tags', filters.tags.join(','));
            if (filters.readStatus) params.set('readStatus', filters.readStatus);
            window.location.href = `?${params.toString()}`;
          }}
          categories={categories}
          tags={tags}
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
                <DocumentCard
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
                  }}
                />
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
