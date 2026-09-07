import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { AddressesService, AddressResponse } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@Controller({ path: 'addresses', version: '1' })
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List addresses of the authenticated user' })
  @ResponseMessage('Get addresses successfully.')
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponse[]> {
    return this.addressesService.findAll(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a delivery address' })
  @ResponseMessage('Address created successfully.')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    return this.addressesService.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned delivery address' })
  @ApiParam({ name: 'id', description: 'Address MongoDB ObjectId' })
  @ResponseMessage('Get address successfully.')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) addressId: string,
  ): Promise<AddressResponse> {
    return this.addressesService.findOne(user.userId, addressId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned delivery address' })
  @ApiParam({ name: 'id', description: 'Address MongoDB ObjectId' })
  @ResponseMessage('Address updated successfully.')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    return this.addressesService.update(user.userId, addressId, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set an owned address as the default address' })
  @ApiParam({ name: 'id', description: 'Address MongoDB ObjectId' })
  @ResponseMessage('Default address updated successfully.')
  setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) addressId: string,
  ): Promise<AddressResponse> {
    return this.addressesService.setDefault(user.userId, addressId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned delivery address' })
  @ApiParam({ name: 'id', description: 'Address MongoDB ObjectId' })
  @ResponseMessage('Address deleted successfully.')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) addressId: string,
  ): Promise<void> {
    await this.addressesService.remove(user.userId, addressId);
  }
}
