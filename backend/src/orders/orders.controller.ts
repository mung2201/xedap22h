import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmMockPaymentDto } from './dto/confirm-mock-payment.dto';
import { ConfirmSandboxQrPaymentDto } from './dto/confirm-sandbox-qr-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { MyOrdersQueryDto } from './dto/my-orders-query.dto';
import {
  OnlinePaymentResponse,
  OrderResponse,
  OrdersService,
} from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order from the authenticated user cart' })
  @ResponseMessage('Order created successfully.')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.ordersService.createFromCart(user.userId, dto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get paginated order history of the authenticated user' })
  @ApiQuery({ type: MyOrdersQueryDto })
  @ResponseMessage('Get orders successfully.')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyOrdersQueryDto,
  ): Promise<PaginatedResult<OrderResponse[]>> {
    return this.ordersService.findMine(user.userId, query);
  }

  @Get('online-payment/:orderCode')
  @ApiOperation({ summary: 'Get an owned QR payment instruction for an online order' })
  @ApiQuery({ name: 'paymentRef', required: false })
  @ResponseMessage('Get QR payment instruction successfully.')
  getOnlinePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderCode') orderCode: string,
    @Query('paymentRef') paymentReference?: string,
  ): Promise<OnlinePaymentResponse> {
    return this.ordersService.getOnlinePayment(
      user.userId,
      orderCode,
      paymentReference,
    );
  }

  @Post('online-payment/:orderCode/confirm')
  @ApiOperation({ summary: 'Confirm a QR payment in SANDBOX mode only' })
  @ResponseMessage('Sandbox QR payment confirmed successfully.')
  confirmSandboxQrPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderCode') orderCode: string,
    @Body() dto: ConfirmSandboxQrPaymentDto,
  ): Promise<OrderResponse> {
    return this.ordersService.confirmSandboxOnlinePayment(
      user.userId,
      orderCode,
      dto.paymentReference,
    );
  }

  @Post('mock-payment/:orderCode/confirm')
  @ApiOperation({ summary: 'Backward-compatible sandbox payment confirmation' })
  @ResponseMessage('Sandbox payment confirmed successfully.')
  confirmMockPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderCode') orderCode: string,
    @Body() dto: ConfirmMockPaymentDto,
  ): Promise<OrderResponse> {
    return this.ordersService.confirmSandboxOnlinePayment(
      user.userId,
      orderCode,
      dto.paymentReference,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned order detail including immutable snapshots' })
  @ResponseMessage('Get order successfully.')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) orderId: string,
  ): Promise<OrderResponse> {
    return this.ordersService.findMineById(user.userId, orderId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an owned pending order and restore reserved stock' })
  @ResponseMessage('Order cancelled successfully.')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) orderId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    return this.ordersService.cancelMine(user.userId, orderId, dto);
  }
}
