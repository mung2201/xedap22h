import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { Address, AddressSchema } from './schemas/address.schema';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
  ],
  controllers: [AddressesController, LocationsController],
  providers: [AddressesService, LocationsService],
  exports: [AddressesService],
})
export class AddressesModule {}
