import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';
import { CheckoutService, PreparedCheckout } from './checkout.service';

@ApiTags('Checkout')
@ApiBearerAuth('access-token')
@Controller({ path: 'checkout', version: '1' })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Validate cart, address, voucher, live prices, and stock before order creation' })
  @ResponseMessage('Checkout preview generated successfully.')
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutPreviewDto,
  ): Promise<PreparedCheckout> {
    return this.checkoutService.preview(user.userId, dto);
  }
}
