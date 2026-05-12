import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
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
  constructor(message = 'סוג קובץ לא נתמך') {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}

const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/heic', bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4 }, // ftypheic
  { mime: 'image/heic', bytes: [0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31], offset: 4 }, // ftypmif1 (HEIF container)
];

export async function verifyFileMagicBytes(filePath: string, declaredMime: string): Promise<boolean> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    for (const sig of MAGIC_BYTES) {
      if (sig.mime !== declaredMime) continue;
      const offset = sig.offset ?? 0;
      if (bytesRead < offset + sig.bytes.length) continue;
      let match = true;
      for (let i = 0; i < sig.bytes.length; i += 1) {
        if (buf[offset + i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  } finally {
    await handle.close();
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
