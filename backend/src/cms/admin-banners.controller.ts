import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { BannerResponse, CmsService } from './cms.service';
import { BannerQueryDto } from './dto/banner-query.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@ApiTags('Admin CMS Banners')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_CMS)
@Controller({ path: 'admin/banners', version: '1' })
export class AdminBannersController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @ApiOperation({ summary: 'List banners and sliders for administration' })
  @ApiQuery({ type: BannerQueryDto })
  @ResponseMessage('Get admin banners successfully.')
  findAll(
    @Query() query: BannerQueryDto,
  ): Promise<PaginatedResult<BannerResponse[]>> {
    return this.cmsService.findAdminBanners(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an admin banner by id' })
  @ResponseMessage('Get banner successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) bannerId: string,
  ): Promise<BannerResponse> {
    return this.cmsService.findAdminBannerById(bannerId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a banner or slider' })
  @ResponseMessage('Banner created successfully.')
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateBannerDto,
  ): Promise<BannerResponse> {
    return this.cmsService.createBanner(dto, actor.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner or slider' })
  @ResponseMessage('Banner updated successfully.')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) bannerId: string,
    @Body() dto: UpdateBannerDto,
  ): Promise<BannerResponse> {
    return this.cmsService.updateBanner(bannerId, dto, actor.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner or slider' })
  @ResponseMessage('Banner deleted successfully.')
  remove(
    @Param('id', ParseMongoIdPipe) bannerId: string,
  ): Promise<{ id: string }> {
    return this.cmsService.removeBanner(bannerId);
  }
}
