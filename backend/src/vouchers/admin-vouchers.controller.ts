import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { VoucherResponse, VouchersService } from './vouchers.service';

@ApiTags('Admin Vouchers')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_VOUCHERS)
@Controller({ path: 'admin/vouchers', version: '1' })
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  @ApiOperation({ summary: 'List vouchers for administration' })
  @ApiQuery({ type: VoucherQueryDto })
  @ResponseMessage('Get vouchers successfully.')
  findAll(
    @Query() query: VoucherQueryDto,
  ): Promise<PaginatedResult<VoucherResponse[]>> {
    return this.vouchersService.findAdmin(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a voucher' })
  @ResponseMessage('Voucher created successfully.')
  create(@Body() dto: CreateVoucherDto): Promise<VoucherResponse> {
    return this.vouchersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  @ResponseMessage('Voucher updated successfully.')
  update(
    @Param('id', ParseMongoIdPipe) voucherId: string,
    @Body() dto: UpdateVoucherDto,
  ): Promise<VoucherResponse> {
    return this.vouchersService.update(voucherId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unused voucher' })
  @ResponseMessage('Voucher deleted successfully.')
  remove(
    @Param('id', ParseMongoIdPipe) voucherId: string,
  ): Promise<{ id: string }> {
    return this.vouchersService.remove(voucherId);
  }
}
