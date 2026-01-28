import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentById,
  deleteDocument,
  updateDocumentMetadata,
} from '@/services/document-service';
import { serializeMarkdown } from '@/lib/fs/metadata-parser';

/**
 * POST /api/documents/batch
 * Perform batch operations on multiple documents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, documentIds, options } = body;

    if (!action || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. action and documentIds are required.' },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    switch (action) {
      case 'delete': {
        for (const id of documentIds) {
          try {
            const success = await deleteDocument(id);
            results.push({ id, success });
          } catch (error) {
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to delete',
            });
          }
        }
        break;
      }

      case 'tag': {
        const tagsToAdd = options?.tags || [];
        for (const id of documentIds) {
          try {
            const document = await getDocumentById(id);
            if (!document) {
              results.push({ id, success: false, error: 'Document not found' });
              continue;
            }

            const updatedTags = [...new Set([...document.metadata.tags, ...tagsToAdd])];
            const updatedMetadata = {
              ...document.metadata,
              tags: updatedTags,
            };

            await updateDocumentMetadata(id, updatedMetadata);
            results.push({ id, success: true });
          } catch (error) {
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to add tags',
            });
          }
        }
        break;
      }

      case 'removeTags': {
        const tagsToRemove = options?.tags || [];
        for (const id of documentIds) {
          try {
            const document = await getDocumentById(id);
            if (!document) {
              results.push({ id, success: false, error: 'Document not found' });
              continue;
            }

            const updatedTags = document.metadata.tags.filter(
              (tag) => !tagsToRemove.includes(tag)
            );
            const updatedMetadata = {
              ...document.metadata,
              tags: updatedTags,
            };

            await updateDocumentMetadata(id, updatedMetadata);
            results.push({ id, success: true });
          } catch (error) {
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to remove tags',
            });
          }
        }
        break;
      }

      case 'setReadStatus': {
        const readStatus = options?.readStatus;
        if (!readStatus) {
          return NextResponse.json(
            { error: 'readStatus is required for setReadStatus action' },
            { status: 400 }
          );
        }

        for (const id of documentIds) {
          try {
            const document = await getDocumentById(id);
            if (!document) {
              results.push({ id, success: false, error: 'Document not found' });
              continue;
            }

            const updatedMetadata = {
              ...document.metadata,
              readStatus,
            };

            await updateDocumentMetadata(id, updatedMetadata);
            results.push({ id, success: true });
          } catch (error) {
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to update status',
            });
          }
        }
        break;
      }

      case 'export': {
        const format = options?.exportFormat || 'json';
        const documents = [];

        for (const id of documentIds) {
          try {
            const document = await getDocumentById(id);
            if (document) {
              documents.push({
                title: document.metadata.title,
                fileName: document.fileName,
                author: document.metadata.author,
                category: document.metadata.category,
                tags: document.metadata.tags,
                readStatus: document.metadata.readStatus,
                rating: document.metadata.rating,
                notes: document.metadata.notes,
                dateAdded: document.metadata.dateAdded,
                customFields: document.metadata.customFields,
              });
              results.push({ id, success: true });
            } else {
              results.push({ id, success: false, error: 'Document not found' });
            }
          } catch (error) {
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to fetch document',
            });
          }
        }

        if (format === 'json') {
          return NextResponse.json({
            success: true,
            count: documents.length,
            documents,
          });
        } else if (format === 'markdown') {
          // Combine all documents into a single markdown file
          const markdownContent = documents
            .map((doc: any) => {
              const frontmatter = serializeMarkdown(doc as any, '');
              return `# ${doc.title}\n\n${frontmatter}\n\n---\n\n`;
            })
            .join('');

          return new NextResponse(markdownContent, {
            headers: {
              'Content-Type': 'text/markdown',
              'Content-Disposition': 'attachment; filename="documents-export.md"',
            },
          });
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      action,
      total: documentIds.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error('Error performing batch operation:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform batch operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
