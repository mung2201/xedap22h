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
import { CmsService, StaticPageResponse } from './cms.service';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { StaticPageQueryDto } from './dto/static-page-query.dto';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';

@ApiTags('Admin CMS Pages')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_CMS)
@Controller({ path: 'admin/pages', version: '1' })
export class AdminPagesController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @ApiOperation({ summary: 'List static pages for administration' })
  @ApiQuery({ type: StaticPageQueryDto })
  @ResponseMessage('Get admin pages successfully.')
  findAll(
    @Query() query: StaticPageQueryDto,
  ): Promise<PaginatedResult<StaticPageResponse[]>> {
    return this.cmsService.findAdminPages(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an admin static page by id' })
  @ResponseMessage('Get page successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) pageId: string,
  ): Promise<StaticPageResponse> {
    return this.cmsService.findAdminPageById(pageId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a static page' })
  @ResponseMessage('Static page created successfully.')
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateStaticPageDto,
  ): Promise<StaticPageResponse> {
    return this.cmsService.createStaticPage(dto, actor.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a static page' })
  @ResponseMessage('Static page updated successfully.')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) pageId: string,
    @Body() dto: UpdateStaticPageDto,
  ): Promise<StaticPageResponse> {
    return this.cmsService.updateStaticPage(pageId, dto, actor.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a static page' })
  @ResponseMessage('Static page deleted successfully.')
  remove(
    @Param('id', ParseMongoIdPipe) pageId: string,
  ): Promise<{ id: string }> {
    return this.cmsService.removeStaticPage(pageId);
  }
}
