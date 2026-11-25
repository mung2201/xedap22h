import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address, AddressDocument } from './schemas/address.schema';
import { AddressFormat } from './address-format.enum';
import { LocationsService } from './locations.service';

export interface AddressResponse {
  id: string;
  recipientName: string;
  phone: string;
  addressFormat: AddressFormat;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
    private readonly locationsService: LocationsService,
  ) {}

  async findAll(userId: string): Promise<AddressResponse[]> {
    const addresses = await this.addressModel
      .find({ user: userId })
      .sort({ isDefault: -1, updatedAt: -1 })
      .exec();

    return addresses.map((address) => this.toResponse(address));
  }

  async findOne(userId: string, addressId: string): Promise<AddressResponse> {
    return this.toResponse(await this.findOwnedAddress(userId, addressId));
  }

  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    assertNoUnexpectedNull(dto);
    const location = this.locationsService.validateAddress(dto);
    const hasAddresses = Boolean(
      await this.addressModel.exists({ user: userId }),
    );
    const { isDefault: requestedDefault, ...addressInput } = dto;
    const isDefault = !hasAddresses || requestedDefault === true;

    if (isDefault) {
      await this.clearCurrentDefault(userId);
    }

    const address = await this.addressModel.create({
      ...addressInput,
      ...location,
      user: userId,
      isDefault,
    });

    return this.toResponse(address);
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    assertNoUnexpectedNull(dto);
    const address = await this.findOwnedAddress(userId, addressId);
    const { isDefault, ...addressInput } = dto;

    if (isDefault === false && address.isDefault) {
      throw new BadRequestException(
        'Use the default-address endpoint to select another default address.',
      );
    }

    const existingFormat = address.addressFormat
      ?? (address.district ? AddressFormat.LEGACY : AddressFormat.CURRENT);
    const locationChanged = (
      (dto.province !== undefined && dto.province !== address.province)
      || (dto.district !== undefined && dto.district !== (address.district ?? ''))
      || (dto.ward !== undefined && dto.ward !== address.ward)
      || (dto.addressFormat !== undefined && dto.addressFormat !== existingFormat)
    );
    if (locationChanged) {
      Object.assign(addressInput, this.locationsService.validateAddress({
        province: dto.province ?? address.province,
        district: dto.district ?? address.district,
        ward: dto.ward ?? address.ward,
        addressFormat: dto.addressFormat,
      }));
    }

    Object.assign(address, addressInput);
    await address.save();

    if (isDefault === true) {
      return this.setDefault(userId, addressId);
    }

    return this.toResponse(address);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await this.findOwnedAddress(userId, addressId);
    const wasDefault = address.isDefault;

    await address.deleteOne();

    if (wasDefault) {
      const replacement = await this.addressModel
        .findOne({ user: userId })
        .sort({ updatedAt: -1 })
        .exec();

      if (replacement) {
        await this.addressModel
          .updateOne({ _id: replacement._id }, { $set: { isDefault: true } })
          .exec();
      }
    }
  }

  async setDefault(
    userId: string,
    addressId: string,
  ): Promise<AddressResponse> {
    const address = await this.findOwnedAddress(userId, addressId);

    if (address.isDefault) {
      return this.toResponse(address);
    }

    await this.clearCurrentDefault(userId);
    address.isDefault = true;
    await address.save();

    return this.toResponse(address);
  }

  private async findOwnedAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressDocument> {
    const address = await this.addressModel
      .findOne({ _id: addressId, user: userId })
      .exec();

    if (!address) {
      throw new NotFoundException('Address not found.');
    }

    return address;
  }

  private async clearCurrentDefault(userId: string): Promise<void> {
    await this.addressModel
      .updateMany(
        { user: userId, isDefault: true },
        { $set: { isDefault: false } },
      )
      .exec();
  }

  private toResponse(address: AddressDocument): AddressResponse {
    return {
      id: address._id.toString(),
      recipientName: address.recipientName,
      phone: address.phone,
      addressFormat: address.addressFormat
        ?? (address.district ? AddressFormat.LEGACY : AddressFormat.CURRENT),
      province: address.province,
      district: address.district ?? '',
      ward: address.ward,
      addressLine: address.addressLine,
      ...(address.note ? { note: address.note } : {}),
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
