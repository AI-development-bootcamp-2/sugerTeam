import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import app from './app';
import { fileStorageService } from './services/file-storage.service';

const PORT = process.env.PORT || 3000;

fileStorageService
  .ensureReady()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to prepare upload directory:', err);
    process.exit(1);
  });
