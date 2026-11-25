import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AddressFormat } from './address-format.enum';
import { LocationOption, LocationsService } from './locations.service';

@ApiTags('Locations')
@Public()
@Controller({ path: 'locations', version: '1' })
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Danh sách tỉnh/thành phố theo định dạng địa chỉ' })
  @ApiQuery({ name: 'format', enum: AddressFormat, required: false })
  @ResponseMessage('Lấy danh sách tỉnh/thành phố thành công.')
  listProvinces(@Query('format') format?: string): LocationOption[] {
    return this.locationsService.listProvinces(format);
  }

  @Get('provinces/:provinceCode/districts')
  @ApiOperation({ summary: 'Danh sách quận/huyện của địa chỉ trước sắp xếp' })
  @ApiQuery({ name: 'format', enum: [AddressFormat.LEGACY], required: false })
  @ResponseMessage('Lấy danh sách quận/huyện thành công.')
  listDistricts(
    @Param('provinceCode') provinceCode: string,
    @Query('format') format?: string,
  ): LocationOption[] {
    return this.locationsService.listDistricts(provinceCode, format);
  }

  @Get('provinces/:provinceCode/wards')
  @ApiOperation({ summary: 'Danh sách phường/xã thuộc tỉnh hoặc quận/huyện đã chọn' })
  @ApiQuery({ name: 'format', enum: AddressFormat, required: false })
  @ApiQuery({ name: 'districtCode', required: false, description: 'Bắt buộc với địa chỉ LEGACY.' })
  @ResponseMessage('Lấy danh sách phường/xã thành công.')
  listWards(
    @Param('provinceCode') provinceCode: string,
    @Query('format') format?: string,
    @Query('districtCode') districtCode?: string,
  ): LocationOption[] {
    return this.locationsService.listWards(provinceCode, format, districtCode);
  }
}
