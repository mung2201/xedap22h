import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { diskStorage } from 'multer';

const allowedMimeTypes = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const getUploadDirectory = (): string =>
  resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

const getMaxImageSizeBytes = (): number => {
  const configuredMegabytes = Number(process.env.UPLOAD_MAX_IMAGE_SIZE_MB ?? 5);
  const megabytes = Number.isFinite(configuredMegabytes)
    ? Math.min(Math.max(configuredMegabytes, 1), 10)
    : 5;

  return Math.round(megabytes * 1024 * 1024);
};

export const createImageUploadOptions = (
  maxFileSize = getMaxImageSizeBytes(),
): MulterOptions => ({
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      const directory = getUploadDirectory();
      mkdirSync(directory, { recursive: true });
      callback(null, directory);
    },
    filename: (_request, file, callback) => {
      const extension =
        allowedMimeTypes.get(file.mimetype) || extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: maxFileSize, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new BadRequestException('Only JPEG, PNG, and WebP image files are accepted.'),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

export const avatarMaxFileSize = 2 * 1024 * 1024;
