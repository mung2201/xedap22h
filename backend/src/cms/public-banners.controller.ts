import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BannerType } from '../common/enums/cms.enum';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { BannerResponse, CmsService } from './cms.service';
import { PublicBannerQueryDto } from './dto/banner-query.dto';
import { PublicSliderQueryDto } from './dto/public-slider-query.dto';

@Public()
@ApiTags('CMS Banners')
@Controller({ path: 'banners', version: '1' })
export class PublicBannersController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active banners and sliders for customers' })
  @ApiQuery({ type: PublicBannerQueryDto })
  @ResponseMessage('Get public banners successfully.')
  findAll(@Query() query: PublicBannerQueryDto): Promise<BannerResponse[]> {
    return this.cmsService.findPublicBanners(query);
  }
}

@Public()
@ApiTags('CMS Banners')
@Controller({ path: 'sliders', version: '1' })
export class PublicSlidersController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active home sliders for customers' })
  @ApiQuery({ type: PublicSliderQueryDto })
  @ResponseMessage('Get public sliders successfully.')
  findAll(@Query() query: PublicSliderQueryDto): Promise<BannerResponse[]> {
    return this.cmsService.findPublicBanners({
      type: BannerType.SLIDER,
      ...(query.position ? { position: query.position } : {}),
    });
  }
}
