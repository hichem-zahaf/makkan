'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Document, DocumentMetadata } from '@/lib/types';
import { DocumentLoading, DocumentError } from '../page';

export function MetadataForm({
  metadata,
  onSave,
  onCancel,
}: {
  metadata: DocumentMetadata;
  onSave: (metadata: DocumentMetadata) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<DocumentMetadata>(metadata);
  const [newTag, setNewTag] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    Object.entries(metadata.customFields || {}).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
      {}
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, customFields });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const addCustomField = () => {
    const key = `custom_${Object.keys(customFields).length}`;
    setCustomFields({ ...customFields, [key]: '' });
  };

  const updateCustomField = (key: string, value: string) => {
    setCustomFields({ ...customFields, [key]: value });
  };

  const removeCustomField = (key: string) => {
    const newFields = { ...customFields };
    delete newFields[key];
    setCustomFields(newFields);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">Title *</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-sm font-medium mb-2">Author</label>
        <Input
          value={formData.author || ''}
          onChange={(e) =>
            setFormData({ ...formData, author: e.target.value || undefined })
          }
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <Input
          value={formData.category || ''}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value || undefined })
          }
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag..."
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  rating: formData.rating === rating ? undefined : rating,
                })
              }
              className="w-8 h-8 rounded focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Star
                className={`w-6 h-6 ${
                  (formData.rating || 0) >= rating
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Read Status */}
      <div>
        <label className="block text-sm font-medium mb-2">Read Status</label>
        <select
          value={formData.readStatus || 'unread'}
          onChange={(e) =>
            setFormData({
              ...formData,
              readStatus: e.target.value as DocumentMetadata['readStatus'],
            })
          }
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="unread">Unread</option>
          <option value="reading">Reading</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* Source URL */}
      <div>
        <label className="block text-sm font-medium mb-2">Source URL</label>
        <Input
          type="url"
          value={formData.source || ''}
          onChange={(e) =>
            setFormData({ ...formData, source: e.target.value || undefined })
          }
          placeholder="https://..."
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value || undefined })
          }
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Add your notes here..."
        />
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Custom Fields</label>
          <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
            Add Field
          </Button>
        </div>
        <div className="space-y-2">
          {Object.entries(customFields).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <Input
                placeholder="Field name"
                value={key.startsWith('custom_') ? '' : key}
                onChange={(e) => {
                  const newFields = { ...customFields };
                  delete newFields[key];
                  newFields[e.target.value] = value;
                  setCustomFields(newFields);
                }}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={value}
                onChange={(e) => updateCustomField(key, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCustomField(key)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`/api/documents/${params.id}`);
        if (!res.ok) {
          throw new Error('Document not found');
        }
        const data = await res.json();
        setDocument(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [params.id]);

  const handleSave = async (metadata: Document['metadata']) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${params.id}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!res.ok) {
        throw new Error('Failed to save metadata');
      }

      router.push(`/documents/${params.id}`);
    } catch (err) {
      console.error('Failed to save metadata:', err);
      alert('Failed to save metadata. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DocumentLoading />;
  }

  if (error || !document) {
    return <DocumentError message={error || 'Document not found'} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Metadata</h1>
      </div>

      {/* Form */}
      <div className="border rounded-lg p-6 bg-card">
        <MetadataForm
          metadata={document.metadata}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
