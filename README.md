# MAKAN - Local PDF Document Management System

A local-first document management system for PDF collections with markdown-based metadata. Built with Next.js 14, TypeScript, and local file system storage (no external database required).

## Overview

MAKKAN helps you organize and manage your downloaded PDF documents using simple markdown files for metadata. Each PDF has a companion `.md` file that stores all metadata (title, author, tags, notes, etc.), making your data portable and easily accessible with any text editor.

## Features

- **Local-First Architecture**: No database required - all data stored in the file system
- **Markdown Metadata**: Simple, human-readable metadata files alongside your PDFs
- **Smart Search**: Fuzzy search across all metadata fields with saved searches
- **Real-Time Updates**: Automatic file watching detects changes in your library folders
- **PDF Viewer**: Embedded viewer with page navigation and zoom controls
- **Flexible Organization**: Support for multiple libraries with custom metadata
- **Bulk Import**: Scan existing folders and auto-generate metadata
- **Drag-and-Drop Upload**: Easy file upload with progress tracking
- **Grid/Table Views**: Toggle between visual layouts
- **Custom Fields**: Add unlimited custom key-value pairs to documents

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Rendering**: react-pdf
- **Search**: Fuse.js (fuzzy search)
- **File Watching**: chokidar
- **Markdown**: gray-matter (frontmatter parsing)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd makkan
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Getting Started

### 1. Configure Your First Library

1. Navigate to Settings
2. Click "Add Library"
3. Enter:
   - **Name**: A descriptive name (e.g., "Research Papers")
   - **Path**: Absolute path to your PDF folder
   - **Organization**: How files are organized (flat, by category, or by year)

### 2. Import Your Documents

1. Go to the Import page
2. Select your library
3. Click "Start Import" to scan your PDFs
4. The system will create companion `.md` files for any PDFs without them

### 3. Upload New Files

1. Go to the Upload page
2. Select a library
3. Optionally set category and tags
4. Drag and drop PDF files or click to browse

### 4. Search and Browse

- Use the search bar for full-text search
- Apply filters for category, tags, author, read status
- Toggle between grid and table views
- Save frequently used searches

## Metadata Format

Each PDF has a companion `.md` file with the following structure:

```markdown
---
title: "Document Title"
author: "Author Name"
category: "Research Papers"
tags: ["machine-learning", "nlp"]
date_added: 2024-01-15
date_modified: 2024-01-20
read_status: "unread"
rating: 5
source: "https://arxiv.org/abs/1234"
notes: "Key insights about the document..."
custom_field: "Any custom key-value pairs"
---

# Optional extended description

Additional markdown content can go here for detailed notes.
```

## Project Structure

```
makkan/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Dashboard pages
│   ├── api/                 # API routes
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── documents/           # Document-related components
│   ├── layout/              # Layout components
│   ├── search/              # Search components
│   ├── upload/              # Upload components
│   └── ui/                  # Reusable UI components
├── lib/                     # Core utilities
│   ├── fs/                  # File system operations
│   ├── search/              # Search functionality
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── services/                # Business logic
│   ├── document-service.ts
│   ├── search-service.ts
│   ├── import-service.ts
│   └── settings-service.ts
├── server/                  # Server-side utilities
│   └── file-watcher-server.ts
└── hooks/                   # React hooks
    ├── use-debounce.ts
    └── use-file-events.ts
```

## API Endpoints

### Documents
- `GET /api/documents` - List all documents (with filters, sorting, pagination)
- `GET /api/documents/[id]` - Get single document
- `PUT /api/documents/[id]` - Update document metadata
- `DELETE /api/documents/[id]` - Delete document
- `POST /api/documents/scan` - Trigger directory scan

### Files
- `GET /api/files/[id]/pdf` - Stream PDF content
- `POST /api/files/upload` - Upload new PDF

### Search
- `GET /api/search` - Search documents

### Settings
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update settings
- `POST /api/settings` - Add library
- `DELETE /api/settings` - Remove library

### Events
- `GET /api/events` - SSE endpoint for real-time file changes

## File Organization

The application stores data in your existing file structure:

```
your-library/
├── research/
│   ├── paper1.pdf
│   ├── paper1.md          # Metadata file
│   ├── paper2.pdf
│   └── paper2.md
└── books/
    ├── book1.pdf
    └── book1.md
```

Files are NOT moved when you change categories in the app - only the metadata is updated. This keeps file operations simple and prevents conflicts with external file managers.

## Configuration

Settings are stored in `data/settings.json`:

```json
{
  "libraries": [
    {
      "id": "unique-id",
      "name": "My Documents",
      "path": "/path/to/documents",
      "organization": "category"
    }
  ],
  "defaultView": "grid",
  "itemsPerPage": 50,
  "autoScan": false,
  "scanInterval": 60,
  "theme": "system"
}
```

## Building for Production

```bash
npm run build
npm start
```

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## Limitations

- Single-user application (no multi-user support)
- File paths are absolute and not portable across machines
- PDF viewer requires modern browser support
- Large PDFs may take time to load

## Future Enhancements

Possible improvements for future versions:

- Full-text PDF content search
- OCR support for scanned PDFs
- Export/import metadata in bulk
- Advanced tagging with hierarchical categories
- Reading notes and highlighting
- Citation management integration
- Mobile-responsive improvements

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Fuse.js](https://fusejs.io/)
- [gray-matter](https://github.com/jonschlinkert/gray-matter)
- [chokidar](https://github.com/paulmillr/chokidar)
- [react-pdf](https://github.com/wojtekmaj/react-pdf)
