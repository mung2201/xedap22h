import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CategoriesService, CategoryResponse } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Admin Categories')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_CATEGORIES)
@Controller({ path: 'admin/categories', version: '1' })
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories for administration' })
  @ResponseMessage('Get admin categories successfully.')
  findAll(): Promise<CategoryResponse[]> {
    return this.categoriesService.findAdminList();
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ResponseMessage('Category created successfully.')
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponse> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ResponseMessage('Category updated successfully.')
  update(
    @Param('id', ParseMongoIdPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    return this.categoriesService.update(categoryId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category when it has no children or products' })
  @ResponseMessage('Category deleted successfully.')
  remove(@Param('id', ParseMongoIdPipe) categoryId: string): Promise<{ id: string }> {
    return this.categoriesService.remove(categoryId);
  }
}
