import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface SaveFileInput {
  file: {
    path: string;
    originalname: string;
    mimetype: string;
  };
  absenceReportId: string;
}

export interface SavedFile {
  storagePath: string;
  fileName: string;
  mimeType: string;
}

function sanitizeOriginalName(name: string): string {
  return path.basename(name).replace(/[^\w.-]+/g, '_');
}

export class FileStorageService {
  private readonly uploadDir: string;

  constructor(uploadDir = process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads')) {
    this.uploadDir = uploadDir;
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  async ensureReady(): Promise<void> {
    await fs.mkdir(path.join(this.uploadDir, 'tmp'), { recursive: true });
    await fs.mkdir(path.join(this.uploadDir, 'absences'), { recursive: true });
  }

  async saveFile({ file, absenceReportId }: SaveFileInput): Promise<SavedFile> {
    const safeName = sanitizeOriginalName(file.originalname);
    const fileName = `${randomUUID()}-${safeName}`;
    const dir = path.join(this.uploadDir, 'absences', absenceReportId);
    await fs.mkdir(dir, { recursive: true });
    const destPath = path.join(dir, fileName);
    await fs.rename(file.path, destPath).catch(async (err: NodeJS.ErrnoException) => {
      if (err.code === 'EXDEV') {
        await fs.copyFile(file.path, destPath);
        await fs.unlink(file.path).catch(() => undefined);
        return;
      }
      throw err;
    });
    return {
      storagePath: destPath,
      fileName: file.originalname,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    await fs.unlink(storagePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }
}

export const fileStorageService = new FileStorageService();
