import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { TrackOrderDto } from './dto/track-order.dto';
import { OrderTrackingResponse, OrdersService } from './orders.service';

@ApiTags('Order Tracking')
@Public()
@Controller({ path: 'orders', version: '1' })
export class OrderTrackingController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('track')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Track an order with its code and the customer or shipping phone number',
  })
  @ResponseMessage('Order tracking information retrieved successfully.')
  track(@Body() dto: TrackOrderDto): Promise<OrderTrackingResponse> {
    return this.ordersService.trackPublic(dto);
  }
}
