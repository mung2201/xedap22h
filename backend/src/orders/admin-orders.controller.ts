import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderResponse, OrdersService } from './orders.service';

@ApiTags('Admin Orders')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_ORDERS)
@Controller({ path: 'admin/orders', version: '1' })
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders for administration' })
  @ApiQuery({ type: AdminOrderQueryDto })
  @ResponseMessage('Get orders successfully.')
  findAll(
    @Query() query: AdminOrderQueryDto,
  ): Promise<PaginatedResult<OrderResponse[]>> {
    return this.ordersService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order detail for administration' })
  @ResponseMessage('Get order successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) orderId: string,
  ): Promise<OrderResponse> {
    return this.ordersService.findAdminById(orderId);
  }

  @Post(':id/payment/sync')
  @ApiOperation({ summary: 'Reconcile an order payment against the authenticated payOS API' })
  @ResponseMessage('Payment status checked successfully.')
  syncPayment(
    @Param('id', ParseMongoIdPipe) orderId: string,
  ): Promise<OrderResponse> {
    return this.ordersService.syncPaymentByAdmin(orderId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition order status or cancel and restore stock' })
  @ResponseMessage('Order status updated successfully.')
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    return this.ordersService.updateStatusByAdmin(actor, orderId, dto);
  }
}
