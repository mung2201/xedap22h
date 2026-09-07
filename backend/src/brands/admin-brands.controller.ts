import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { BrandResponse, BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('Admin Brands')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_CATEGORIES)
@Controller({ path: 'admin/brands', version: '1' })
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List all brands for administration' })
  @ResponseMessage('Get admin brands successfully.')
  findAll(): Promise<BrandResponse[]> {
    return this.brandsService.findAdminList();
  }

  @Post()
  @ApiOperation({ summary: 'Create a brand' })
  @ResponseMessage('Brand created successfully.')
  create(@Body() dto: CreateBrandDto): Promise<BrandResponse> {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a brand' })
  @ResponseMessage('Brand updated successfully.')
  update(
    @Param('id', ParseMongoIdPipe) brandId: string,
    @Body() dto: UpdateBrandDto,
  ): Promise<BrandResponse> {
    return this.brandsService.update(brandId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a brand when it is not used by products' })
  @ResponseMessage('Brand deleted successfully.')
  remove(@Param('id', ParseMongoIdPipe) brandId: string): Promise<{ id: string }> {
    return this.brandsService.remove(brandId);
  }
}
