import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
import { AdminServiceBookingQueryDto } from './dto/admin-service-booking-query.dto';
import { UpdateServiceBookingStatusDto } from './dto/update-service-booking-status.dto';
import {
  ServiceBookingResponse,
  ServiceBookingsService,
} from './service-bookings.service';

@ApiTags('Admin Service Bookings')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_SERVICE_BOOKINGS)
@Controller({ path: 'admin/service-bookings', version: '1' })
export class AdminServiceBookingsController {
  constructor(private readonly serviceBookingsService: ServiceBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bicycle service bookings for administration' })
  @ApiQuery({ type: AdminServiceBookingQueryDto })
  @ResponseMessage('Get service bookings successfully.')
  findAll(
    @Query() query: AdminServiceBookingQueryDto,
  ): Promise<PaginatedResult<ServiceBookingResponse[]>> {
    return this.serviceBookingsService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service booking detail for administration' })
  @ResponseMessage('Get service booking successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) bookingId: string,
  ): Promise<ServiceBookingResponse> {
    return this.serviceBookingsService.findAdminById(bookingId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition a service booking status' })
  @ResponseMessage('Service booking status updated successfully.')
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) bookingId: string,
    @Body() dto: UpdateServiceBookingStatusDto,
  ): Promise<ServiceBookingResponse> {
    return this.serviceBookingsService.updateStatusByAdmin(
      actor.userId,
      bookingId,
      dto,
    );
  }
}
