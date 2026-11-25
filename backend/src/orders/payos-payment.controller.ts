import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { OrdersService } from './orders.service';

@ApiTags('payOS payments')
@Controller({ path: 'payments/payos', version: '1' })
export class PayosPaymentController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify a payOS webhook and reconcile the payment with payOS' })
  async notify(@Body() body: unknown): Promise<void> {
    await this.ordersService.handlePayosNotification(body);
  }
}
