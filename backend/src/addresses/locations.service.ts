import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AddressFormat } from './address-format.enum';
import locations from './data/vietnam-locations.json';

export interface LocationOption {
  code: string;
  name: string;
}

interface CurrentProvince extends LocationOption {
  wards: LocationOption[];
}

interface LegacyDistrict extends LocationOption {
  wards: LocationOption[];
}

interface LegacyProvince extends LocationOption {
  districts: LegacyDistrict[];
}

interface LocationInput {
  province: string;
  district?: string;
  ward: string;
  addressFormat?: AddressFormat;
}

const currentProvinces: CurrentProvince[] = locations.current;
const legacyProvinces: LegacyProvince[] = locations.legacy;

const options = (items: readonly LocationOption[]): LocationOption[] =>
  items.map(({ code, name }) => ({ code, name }));

@Injectable()
export class LocationsService {
  listProvinces(format?: string): LocationOption[] {
    return options(this.parseFormat(format) === AddressFormat.CURRENT
      ? currentProvinces
      : legacyProvinces);
  }

  listDistricts(provinceCode: string, format?: string): LocationOption[] {
    if (this.parseFormat(format, AddressFormat.LEGACY) !== AddressFormat.LEGACY) {
      throw new BadRequestException('Địa chỉ hiện tại không có cấp quận/huyện.');
    }
    return options(this.findLegacyProvince(provinceCode).districts);
  }

  listWards(provinceCode: string, format?: string, districtCode?: string): LocationOption[] {
    if (this.parseFormat(format) === AddressFormat.CURRENT) {
      if (districtCode !== undefined && districtCode !== '') {
        throw new BadRequestException('Địa chỉ hiện tại không có cấp quận/huyện.');
      }
      const province = currentProvinces.find(({ code }) => code === provinceCode);
      if (!province) {
        throw new NotFoundException('Không tìm thấy tỉnh/thành phố.');
      }
      return options(province.wards);
    }

    const province = this.findLegacyProvince(provinceCode);
    if (!districtCode) {
      throw new BadRequestException('Vui lòng chọn quận/huyện trước khi chọn phường/xã.');
    }
    const district = province.districts.find(({ code }) => code === districtCode);
    if (!district) {
      throw new NotFoundException('Quận/huyện không thuộc tỉnh/thành phố đã chọn.');
    }
    return options(district.wards);
  }

  validateAddress(input: LocationInput): Required<LocationInput> {
    const district = input.district ?? '';
    const addressFormat = this.parseFormat(
      input.addressFormat,
      district ? AddressFormat.LEGACY : AddressFormat.CURRENT,
    );

    if (addressFormat === AddressFormat.CURRENT) {
      if (district !== '') {
        throw new BadRequestException('Địa chỉ hiện tại chỉ gồm tỉnh/thành phố và phường/xã; vui lòng bỏ quận/huyện.');
      }
      const province = currentProvinces.find(({ name }) => name === input.province);
      if (!province) {
        throw new BadRequestException('Vui lòng chọn tỉnh/thành phố trong danh sách địa chỉ hiện tại.');
      }
      if (!province.wards.some(({ name }) => name === input.ward)) {
        throw new BadRequestException('Phường/xã không thuộc tỉnh/thành phố đã chọn.');
      }
    } else {
      const province = legacyProvinces.find(({ name }) => name === input.province);
      if (!province) {
        throw new BadRequestException('Vui lòng chọn tỉnh/thành phố trong danh sách địa chỉ trước sắp xếp.');
      }
      const selectedDistrict = province.districts.find(({ name }) => name === district);
      if (!selectedDistrict) {
        throw new BadRequestException('Quận/huyện không thuộc tỉnh/thành phố đã chọn.');
      }
      const wardIsValid = selectedDistrict.wards.length === 0
        ? input.ward === ''
        : selectedDistrict.wards.some(({ name }) => name === input.ward);
      if (!wardIsValid) {
        throw new BadRequestException('Phường/xã không thuộc quận/huyện đã chọn.');
      }
    }

    return { province: input.province, district, ward: input.ward, addressFormat };
  }

  private parseFormat(value?: string, fallback = AddressFormat.CURRENT): AddressFormat {
    if (value === undefined) {
      return fallback;
    }
    if (value !== AddressFormat.CURRENT && value !== AddressFormat.LEGACY) {
      throw new BadRequestException('Định dạng địa chỉ phải là CURRENT hoặc LEGACY.');
    }
    return value;
  }

  private findLegacyProvince(provinceCode: string): LegacyProvince {
    const province = legacyProvinces.find(({ code }) => code === provinceCode);
    if (!province) {
      throw new NotFoundException('Không tìm thấy tỉnh/thành phố trước sắp xếp.');
    }
    return province;
  }
}
