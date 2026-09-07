import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CmsService, StaticPageResponse } from './cms.service';

@Public()
@ApiTags('CMS Pages')
@Controller({ path: 'pages', version: '1' })
export class PublicPagesController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @ApiOperation({ summary: 'List published static pages' })
  @ResponseMessage('Get published pages successfully.')
  findAll(): Promise<StaticPageResponse[]> {
    return this.cmsService.findPublicPages();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get one published static page by slug' })
  @ResponseMessage('Get published page successfully.')
  findOne(@Param('slug') slug: string): Promise<StaticPageResponse> {
    return this.cmsService.findPublicPageBySlug(slug);
  }
}
