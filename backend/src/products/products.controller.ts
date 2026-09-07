import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  ProductFacetsResponse,
  ProductResponse,
  ProductsService,
} from './products.service';

@ApiTags('Products')
@Public()
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active products with search, filters, sort, and pagination' })
  @ApiQuery({ type: ProductQueryDto })
  @ApiOkResponse({ description: 'Paginated product collection.' })
  @ResponseMessage('Get products successfully.')
  findAll(
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResult<ProductResponse[]>> {
    return this.productsService.findPublic(query);
  }

  @Get('facets')
  @ApiOperation({
    summary: 'Get active product names, price range, colors, and sizes for storefront filters',
  })
  @ApiOkResponse({ description: 'Product filter facets.' })
  @ResponseMessage('Get product filter facets successfully.')
  findFacets(): Promise<ProductFacetsResponse> {
    return this.productsService.findPublicFacets();
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related active products by category' })
  @ResponseMessage('Get related products successfully.')
  findRelated(@Param('slug') slug: string): Promise<ProductResponse[]> {
    return this.productsService.findRelatedBySlug(slug);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active product by slug' })
  @ResponseMessage('Get product successfully.')
  findOne(@Param('slug') slug: string): Promise<ProductResponse> {
    return this.productsService.findPublicBySlug(slug);
  }
}
