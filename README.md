# MAKKAN - Local File Management System

A local-first file management system designed to help you keep track of all your files with SQLite-based indexing and markdown metadata. Built with Next.js 15, React 19, TypeScript, and better-sqlite3.

## Overview

MAKKAN helps you organize and manage your local files using a hybrid architecture: files are stored on the filesystem while a SQLite database provides fast indexing, search, and filtering capabilities for metadata. This approach ensures data portability while delivering excellent performance for large collections. The main goal is to make it easier for people to keep track of their files—whether documents, images, ebooks, or any other type.

## Features

- **Hybrid Storage Architecture**: Filesystem as source of truth with SQLite for fast queries
- **Full-Text Search**: FTS5-powered search with BM25 ranking across all file metadata
- **Real-Time Updates**: Automatic file watching and database synchronization
- **File Viewer**: Built-in PDF viewer with page navigation and zoom controls
- **Multi-File Type Support**: PDF with extensible support for additional file types
- **Flexible Organization**: Support for multiple libraries with custom categories
- **Bulk Operations**: Batch import, export, and metadata editing
- **Advanced Filters**: Filter by category, tags, author, read status, favorites, and date ranges
- **Favorites & Ratings**: Mark documents as favorites and rate them 1-5 stars
- **Reading Progress Tracking**: Track unread, reading, and read status
- **Grid/Table Views**: Toggle between visual layouts with sortable columns

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 19.0
- **Language**: TypeScript 5.7
- **Database**: better-sqlite3 with FTS5 full-text search
- **Styling**: Tailwind CSS 3.4
- **File Rendering**: react-pdf 9.1 (PDF support, extensible for other types)
- **Search**: FTS5 + Fuse.js (fallback)
- **File Watching**: chokidar 4.0
- **UI Components**: Radix UI primitives
- **Theme**: next-themes (light/dark mode)

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
   - **Name**: A descriptive name (e.g., "Documents", "Research", "E-books")
   - **Path**: Absolute path to your files folder
   - **Organization**: How files are organized (flat, by category, or by year)

### 2. Import Your Files

1. Go to the Import page
2. Select your library
3. Click "Start Scan" to scan your files and index them in the database

### 3. Upload New Files

1. Go to the Upload page
2. Select a library
3. Optionally set category and tags
4. Drag and drop files or click to browse

### 4. Search and Browse

- Use the search bar for full-text search across all metadata
- Apply filters for category, tags, author, read status, favorites, and date ranges
- Toggle between grid and table views
- Sort by any column in table view

## Database

MAKKAN uses SQLite for fast querying and indexing while keeping the filesystem as the ultimate source of truth.

### Database Schema

The database (`data/makkan.db`) contains the following tables:

- **`libraries`** - Document library configurations
- **`documents`** - Main document metadata storage
- **`authors`** - Normalized author names
- **`categories`** - Normalized category names
- **`tags`** - Normalized tag names
- **`document_tags`** - Junction table for many-to-many relationship
- **`settings`** - Application settings and sync tracking
- **`documents_fts`** - FTS5 virtual table for full-text search

### Database Commands

```bash
# Full sync from filesystem (scans all documents)
npm run db:migrate

# Quick sync (only modified documents)
npm run db:sync

# Force full re-sync (drops and recreates database)
npm run db:reset
```

## Project Structure

```
makkan/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Dashboard pages
│   │   ├── documents/       # Document browsing and details
│   │   ├── settings/        # Library configuration
│   │   ├── import/          # Document scanning
│   │   └── upload/          # File upload
│   ├── api/                 # API routes
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── documents/           # Document-related components
│   ├── layout/              # Layout components
│   ├── search/              # Search components
│   ├── upload/              # Upload components
│   └── ui/                  # Reusable UI components
├── lib/                     # Core utilities
│   ├── db/                  # Database utilities
│   ├── fs/                  # File system operations
│   ├── search/              # Search functionality
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── services/                # Business logic
│   ├── document-service.ts  # Document CRUD operations
│   ├── query-service.ts     # SQLite queries
│   ├── search-service.ts    # Search functionality
│   └── sync-service.ts      # Database synchronization
├── scripts/                 # Utility scripts
│   └── migrate-to-sqlite.ts # Database migration
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
- `POST /api/documents/batch` - Batch operations
- `PUT /api/documents/[id]/metadata` - Update metadata only
- `POST /api/documents/[id]/duplicate` - Duplicate document
- `GET /api/documents/[id]/export` - Export document metadata
- `PUT /api/documents/[id]/favorite` - Toggle favorite status

### Files
- `GET /api/files/[id]/pdf` - Stream PDF content
- `GET /api/files/[id]/file` - Download original file
- `POST /api/files/upload` - Upload new PDF

### Search
- `GET /api/search` - Full-text search with filters

### Settings
- `GET /api/settings` - Get application settings
- `POST /api/settings` - Update settings
- `GET /api/settings/libraries/count` - Get library statistics
- `GET /api/settings/libraries/[id]` - Get library details
- `POST /api/settings/libraries/[id]` - Add library
- `DELETE /api/settings/libraries/[id]` - Remove library

### Sync
- `POST /api/sync` - Trigger database synchronization

### Events
- `GET /api/events` - SSE endpoint for real-time updates

## File Organization

The application stores data in your existing file structure:

```
your-library/
├── research/
│   ├── paper1.pdf
│   └── paper2.pdf
└── books/
    ├── book1.epub
    └── book2.pdf
```

Files are NOT moved when you change categories in the app - only the metadata is updated. This keeps file operations simple and prevents conflicts with external file managers.

## Configuration

Settings are stored in SQLite database and include:

- Library configurations (name, path, organization)
- Default view preferences (grid/table)
- Items per page
- Theme preference (light/dark/system)
- Auto-scan settings

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

# Database operations
npm run db:migrate  # Full sync
npm run db:sync     # Quick sync
npm run db:reset    # Force re-sync
```

## Architecture Details

### Hybrid Storage Model

MAKKAN uses a hybrid storage approach:

1. **Filesystem Layer**: Your files stored as-is (source of truth)
2. **Database Layer**: SQLite with FTS5 for fast querying and indexing
3. **Sync Layer**: Automatic synchronization between filesystem and database

This ensures:
- Data portability (your files are always accessible)
- Fast queries and search (SQLite indexing)
- Reliability (filesystem never loses data)

### Search Implementation

- **Primary**: FTS5 full-text search with BM25 ranking
- **Fallback**: Fuse.js fuzzy search when SQLite unavailable
- **Features**: Prefix search, phrase matching, field-specific searches

### Performance Features

- Multiple indexes on commonly queried fields
- Triggers for automatic FTS table synchronization
- Pagination support
- In-memory document caching
- Lazy loading for large collections

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Upcoming Features

- **Advanced Filter & Metadata System**
  - Custom metadata fields per library
  - Multi-condition filter combinations (AND/OR logic)
  - Saved filter presets
  - Metadata templates for different file types
  - Bulk metadata editing improvements

- **AI Integration for Fast File Lookup**
  - Ollama integration for local AI processing
  - Cloud AI API support (OpenAI, Anthropic, etc.)
  - Natural language search queries
  - Automatic content summarization
  - Smart tagging suggestions
  - Document similarity detection
  - AI-powered categorization

- **File Sharing System**
  - Generate shareable links for documents
  - Expiration settings for shared links
  - Permission levels (view, download, edit)
  - Share link management and tracking
  - Optional password protection

- **Support for More File Types**
  - Office documents (DOCX, XLSX, PPTX)
  - Images (PNG, JPG, GIF, SVG) with previews
  - Text files (TXT, MD)
  - E-books (EPUB, MOBI) with reader
  - Video files (MP4, MKV) - metadata extraction
  - Audio files (MP3, FLAC) - metadata extraction
  - Archives (ZIP, RAR) - cataloging

- **Visual Enhancements**
  - Enhanced animations and transitions
  - Better dark mode color contrast
  - More refined card designs
  - Improved empty states and loading indicators
  - Better responsive layouts
  - Cover image thumbnails for documents

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS](https://tailwindcss.com/)
- [Fuse.js](https://fusejs.io/)
- [chokidar](https://github.com/paulmillr/chokidar)
- [react-pdf](https://github.com/wojtekmaj/react-pdf)
