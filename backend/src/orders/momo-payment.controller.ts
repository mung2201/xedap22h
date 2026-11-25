import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { OrdersService } from './orders.service';

@ApiTags('MoMo payments')
@Controller({ path: 'payments/momo', version: '1' })
export class MomoPaymentController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('ipn')
  @HttpCode(204)
  @ApiOperation({ summary: 'Receive a signed MoMo payment notification' })
  async notify(@Body() body: unknown): Promise<void> {
    // MoMo may add optional fields. Validate all signed fields explicitly in
    // the provider rather than stripping them through a checkout DTO.
    await this.ordersService.handleMomoNotification(body);
  }
}
