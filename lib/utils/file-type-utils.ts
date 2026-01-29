import { FileType } from '@/components/documents/file-icon';

/**
 * Supported file extensions by category
 */
export const SUPPORTED_EXTENSIONS = {
  preview: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.avif', '.heic'],
    pdf: ['.pdf'],
    documents: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.rtf'],
    text: ['.txt', '.md', '.log', '.csv', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini'],
    videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp'],
    audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus'],
  },
  noPreview: {
    code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.lua', '.r', '.m', '.swift', '.vb'],
    archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.z'],
    executables: ['.exe', '.msi', '.app', '.dmg', '.deb', '.rpm'],
    fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
  },
};

/**
 * All supported extensions flattened
 */
export const ALL_EXTENSIONS = [
  ...Object.values(SUPPORTED_EXTENSIONS.preview).flat(),
  ...Object.values(SUPPORTED_EXTENSIONS.noPreview).flat()
];

/**
 * Get file type from extension
 */
export function getFileTypeFromExtension(ext: string): FileType {
  const extLower = ext.toLowerCase();

  // Remove leading dot if present
  const normalizedExt = extLower.startsWith('.') ? extLower : `.${extLower}`;

  // Preview types
  if (SUPPORTED_EXTENSIONS.preview.pdf.includes(normalizedExt)) return 'pdf';
  if (SUPPORTED_EXTENSIONS.preview.images.includes(normalizedExt)) return 'image';
  if (SUPPORTED_EXTENSIONS.preview.videos.includes(normalizedExt)) return 'video';
  if (SUPPORTED_EXTENSIONS.preview.audio.includes(normalizedExt)) return 'audio';
  if (SUPPORTED_EXTENSIONS.preview.documents.includes(normalizedExt)) return 'document';
  if (SUPPORTED_EXTENSIONS.preview.text.includes(normalizedExt)) return 'text';

  // No preview types
  if (SUPPORTED_EXTENSIONS.noPreview.code.includes(normalizedExt)) return 'code';
  if (SUPPORTED_EXTENSIONS.noPreview.archives.includes(normalizedExt)) return 'archive';

  return 'unknown';
}

/**
 * Check if a file type is previewable
 */
export function isPreviewable(fileType: FileType): boolean {
  return ['pdf', 'image', 'video', 'audio', 'text', 'document'].includes(fileType);
}

/**
 * Get the preview component type for a file type
 */
export function getPreviewComponent(fileType: FileType): string | null {
  switch (fileType) {
    case 'pdf':
      return 'pdf';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'text':
    case 'document':
      return 'text';
    default:
      return null;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext ? `.${ext}` : '';
}

/**
 * Check if a file is supported
 */
export function isSupportedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALL_EXTENSIONS.includes(ext);
}
