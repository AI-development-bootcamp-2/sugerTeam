import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { fileStorageService } from '@/services/file-storage.service';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
]);

export class UnsupportedFileTypeError extends Error {
  status = 400;
  constructor() {
    super('סוג קובץ לא נתמך');
    this.name = 'UnsupportedFileTypeError';
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(fileStorageService.getUploadDir(), 'tmp');
    cb(null, tmpDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new UnsupportedFileTypeError());
}

export const uploadAbsenceDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});
