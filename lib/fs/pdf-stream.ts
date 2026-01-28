import { promises as fs } from 'fs';
import { createReadStream, existsSync } from 'fs';
import type { Readable } from 'stream';

/**
 * Stream a PDF file to the response
 */
export async function streamPdfFile(
  filePath: string,
  response: {
    setHeader: (name: string, value: string) => void;
    send: (stream: Readable) => void;
    status: (code: number) => {
      send: (body: string) => void;
    };
  }
): Promise<void> {
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      return response.status(404).send('PDF file not found');
    }

    // Set headers for PDF streaming
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Accept-Ranges', 'bytes');

    // Create read stream
    const stream = createReadStream(filePath);

    // Send the stream
    response.send(stream);
  } catch (error) {
    console.error('Error streaming PDF:', error);
    response.status(500).send('Error streaming PDF file');
  }
}

/**
 * Get PDF file info
 */
export async function getPdfInfo(filePath: string): Promise<{
  exists: boolean;
  size?: number;
  created?: Date;
  modified?: Date;
}> {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Check if a file is a valid PDF
 */
export async function isValidPdf(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    // Check file extension
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return false;
    }

    // Check file magic number (PDF files start with %PDF-)
    const buffer = Buffer.alloc(5);
    const fd = await fs.open(filePath, 'r');
    await fd.read(buffer, 0, 5, 0);
    await fd.close();

    return buffer.toString('ascii').startsWith('%PDF-');
  } catch {
    return false;
  }
}

/**
 * Get a range of bytes from a PDF file (for range requests)
 */
export async function getPdfRange(
  filePath: string,
  start: number,
  end: number
): Promise<Buffer> {
  const buffer = Buffer.alloc(end - start + 1);
  const fd = await fs.open(filePath, 'r');
  await fd.read(buffer, 0, end - start + 1, start);
  await fd.close();
  return buffer;
}

/**
 * Get the total size of all PDFs in a directory
 */
export async function getTotalPdfSize(directoryPath: string): Promise<number> {
  // This is a simplified version - a full implementation would recursively scan
  try {
    const stats = await fs.stat(directoryPath);
    if (stats.isFile() && directoryPath.toLowerCase().endsWith('.pdf')) {
      return stats.size;
    }
    return 0;
  } catch {
    return 0;
  }
}
