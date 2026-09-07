import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { RecommendSizeDto } from './dto/recommend-size.dto';
import {
  SizeGuidesService,
  SizeRecommendationResponse,
} from './size-guides.service';

@Public()
@ApiTags('Size Guide')
@Controller({ path: 'size-guide', version: '1' })
export class SizeGuideController {
  constructor(private readonly sizeGuidesService: SizeGuidesService) {}

  @Post('recommend')
  @ApiOperation({ summary: 'Recommend a bike size from database-backed rules' })
  @ResponseMessage('Get size recommendation successfully.')
  recommend(@Body() dto: RecommendSizeDto): Promise<SizeRecommendationResponse> {
    return this.sizeGuidesService.recommend(dto);
  }
}
