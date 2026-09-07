import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, ProductsService } from './products.service';

@ApiTags('Admin Products')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_PRODUCTS)
@Controller({ path: 'admin/products', version: '1' })
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get products including inactive products for administration' })
  @ApiQuery({ type: AdminProductQueryDto })
  @ResponseMessage('Get admin products successfully.')
  findAll(
    @Query() query: AdminProductQueryDto,
  ): Promise<PaginatedResult<ProductResponse[]>> {
    return this.productsService.findAdmin(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product with images, specifications, and variants' })
  @ResponseMessage('Product created successfully.')
  create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
    return this.productsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID for administration' })
  @ResponseMessage('Get admin product successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) productId: string,
  ): Promise<ProductResponse> {
    return this.productsService.findAdminById(productId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product information, variants, stock, or status' })
  @ResponseMessage('Product updated successfully.')
  update(
    @Param('id', ParseMongoIdPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    return this.productsService.update(productId, dto);
  }
}
