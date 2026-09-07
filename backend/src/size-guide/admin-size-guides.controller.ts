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
import { CreateSizeGuideDto } from './dto/create-size-guide.dto';
import { SizeGuideQueryDto } from './dto/size-guide-query.dto';
import { UpdateSizeGuideDto } from './dto/update-size-guide.dto';
import { SizeGuideResponse, SizeGuidesService } from './size-guides.service';

@ApiTags('Admin Size Guides')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_CMS)
@Controller({ path: 'admin/size-guides', version: '1' })
export class AdminSizeGuidesController {
  constructor(private readonly sizeGuidesService: SizeGuidesService) {}

  @Get()
  @ApiOperation({ summary: 'List size guide rules for administration' })
  @ApiQuery({ type: SizeGuideQueryDto })
  @ResponseMessage('Get size guide rules successfully.')
  findAll(
    @Query() query: SizeGuideQueryDto,
  ): Promise<PaginatedResult<SizeGuideResponse[]>> {
    return this.sizeGuidesService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one size guide rule' })
  @ResponseMessage('Get size guide rule successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) ruleId: string,
  ): Promise<SizeGuideResponse> {
    return this.sizeGuidesService.findAdminById(ruleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a size guide rule' })
  @ResponseMessage('Size guide rule created successfully.')
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateSizeGuideDto,
  ): Promise<SizeGuideResponse> {
    return this.sizeGuidesService.create(dto, actor.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a size guide rule' })
  @ResponseMessage('Size guide rule updated successfully.')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) ruleId: string,
    @Body() dto: UpdateSizeGuideDto,
  ): Promise<SizeGuideResponse> {
    return this.sizeGuidesService.update(ruleId, dto, actor.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a size guide rule' })
  @ResponseMessage('Size guide rule deleted successfully.')
  remove(
    @Param('id', ParseMongoIdPipe) ruleId: string,
  ): Promise<{ id: string }> {
    return this.sizeGuidesService.remove(ruleId);
  }
}
