import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { RecommendationMessageDto } from './dto/recommendation-message.dto';
import {
  RecommendationFlowResponse,
  RecommendationsService,
} from './recommendations.service';

@Public()
@ApiTags('Product Recommendation Chatbot')
@Controller({ path: 'chatbot/recommendation', version: '1' })
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post('start')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a product recommendation conversation' })
  @ResponseMessage('Recommendation conversation started successfully.')
  start(): Promise<RecommendationFlowResponse> {
    return this.recommendationsService.start();
  }

  @Post('message')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Advance a product recommendation conversation' })
  @ResponseMessage('Recommendation conversation advanced successfully.')
  message(
    @Body() dto: RecommendationMessageDto,
  ): Promise<RecommendationFlowResponse> {
    return this.recommendationsService.continue(dto);
  }
}
