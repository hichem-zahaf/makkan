import { FileText, Image, Video, FileCode, File, Music } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type FileType = 'pdf' | 'image' | 'video' | 'audio' | 'document' | 'text' | 'code' | 'archive' | 'unknown';

interface FileIconProps {
  fileType: FileType;
  className?: string;
}

const fileIcons = {
  pdf: FileText,
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  text: FileText,
  code: FileCode,
  archive: File,
  unknown: File,
};

const fileColors = {
  pdf: 'text-red-500',
  image: 'text-purple-500',
  video: 'text-blue-500',
  audio: 'text-green-500',
  document: 'text-blue-600',
  text: 'text-gray-600',
  code: 'text-yellow-600',
  archive: 'text-orange-500',
  unknown: 'text-gray-400',
};

export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'avif', 'heic'];
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'];
  const documentExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf'];
  const textExts = ['txt', 'md', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini'];
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'z'];

  if (ext === 'pdf') return 'pdf';
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (documentExts.includes(ext)) return 'document';
  if (textExts.includes(ext)) return 'text';
  if (codeExts.includes(ext)) return 'code';
  if (archiveExts.includes(ext)) return 'archive';

  return 'unknown';
}

export function isPreviewable(fileType: FileType): boolean {
  return ['pdf', 'image', 'video', 'audio', 'text'].includes(fileType);
}

export function FileIcon({ fileType, className }: FileIconProps) {
  const Icon = fileIcons[fileType];
  const colorClass = fileColors[fileType];

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Icon className={cn('w-6 h-6', colorClass)} />
    </div>
  );
}
