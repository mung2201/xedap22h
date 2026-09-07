import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadImageResponse {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  toImageResponse(file?: Express.Multer.File): UploadImageResponse {
    if (!file?.filename) {
      throw new BadRequestException('An image file is required.');
    }

    const backendUrl = this.configService.getOrThrow<string>('app.backendUrl');

    return {
      url: `${backendUrl}/uploads/${encodeURIComponent(file.filename)}`,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
