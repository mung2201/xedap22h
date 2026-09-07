import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CancelServiceBookingDto } from './dto/cancel-service-booking.dto';
import { CreateServiceBookingDto } from './dto/create-service-booking.dto';
import { MyServiceBookingsQueryDto } from './dto/my-service-bookings-query.dto';
import {
  ServiceBookingResponse,
  ServiceBookingsService,
} from './service-bookings.service';

@ApiTags('Service Bookings')
@ApiBearerAuth('access-token')
@Roles(UserRole.CUSTOMER)
@Controller({ path: 'service-bookings', version: '1' })
export class ServiceBookingsController {
  constructor(private readonly serviceBookingsService: ServiceBookingsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a bicycle maintenance, repair, assembly, or bike-fit booking' })
  @ResponseMessage('Service booking created successfully.')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceBookingDto,
  ): Promise<ServiceBookingResponse> {
    return this.serviceBookingsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the authenticated customer service bookings' })
  @ApiQuery({ type: MyServiceBookingsQueryDto })
  @ResponseMessage('Get service bookings successfully.')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyServiceBookingsQueryDto,
  ): Promise<PaginatedResult<ServiceBookingResponse[]>> {
    return this.serviceBookingsService.findMine(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned service booking detail' })
  @ResponseMessage('Get service booking successfully.')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) bookingId: string,
  ): Promise<ServiceBookingResponse> {
    return this.serviceBookingsService.findMineById(user.userId, bookingId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an owned pending or confirmed service booking' })
  @ResponseMessage('Service booking cancelled successfully.')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) bookingId: string,
    @Body() dto: CancelServiceBookingDto,
  ): Promise<ServiceBookingResponse> {
    return this.serviceBookingsService.cancelMine(user.userId, bookingId, dto);
  }
}
