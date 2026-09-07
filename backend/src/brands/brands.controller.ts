import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { BrandResponse, BrandsService } from './brands.service';

@ApiTags('Brands')
@Public()
@Controller({ path: 'brands', version: '1' })
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active brands for customer storefront' })
  @ApiOkResponse({ description: 'Active brand list.' })
  @ResponseMessage('Get brands successfully.')
  findAll(): Promise<BrandResponse[]> {
    return this.brandsService.findPublicList();
  }
}
