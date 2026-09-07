import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AnyPermissions } from '../common/decorators/any-permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  avatarMaxFileSize,
  createImageUploadOptions,
} from './image-upload.options';
import { UploadImageResponse, UploadsService } from './uploads.service';

const uploadApiBody = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: {
      file: { type: 'string', format: 'binary' },
    },
  },
};

@ApiTags('Uploads')
@ApiBearerAuth('access-token')
@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('avatar')
  @ApiOperation({ summary: 'Upload an authenticated user avatar image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadApiBody)
  @UseInterceptors(
    FileInterceptor('file', createImageUploadOptions(avatarMaxFileSize)),
  )
  @ResponseMessage('Avatar image uploaded successfully.')
  uploadAvatar(
    @UploadedFile() file?: Express.Multer.File,
  ): UploadImageResponse {
    return this.uploadsService.toImageResponse(file);
  }

  @Post('images')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @AnyPermissions(
    Permission.MANAGE_PRODUCTS,
    Permission.MANAGE_CATEGORIES,
    Permission.MANAGE_CMS,
  )
  @ApiOperation({ summary: 'Upload a product, category, brand, or CMS image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadApiBody)
  @UseInterceptors(FileInterceptor('file', createImageUploadOptions()))
  @ResponseMessage('Image uploaded successfully.')
  uploadManagementImage(
    @UploadedFile() file?: Express.Multer.File,
  ): UploadImageResponse {
    return this.uploadsService.toImageResponse(file);
  }
}
