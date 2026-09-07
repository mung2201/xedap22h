import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CategoriesService, CategoryTreeNode } from './categories.service';

@ApiTags('Categories')
@Public()
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active category tree for customer storefront' })
  @ApiOkResponse({ description: 'Active category hierarchy.' })
  @ResponseMessage('Get categories successfully.')
  findAll(): Promise<CategoryTreeNode[]> {
    return this.categoriesService.findPublicTree();
  }
}
