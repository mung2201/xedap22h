import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from '../addresses/schemas/address.schema';
import { BrandsModule } from '../brands/brands.module';
import { Cart, CartSchema } from '../carts/schemas/cart.schema';
import { CategoriesModule } from '../categories/categories.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    CategoriesModule,
    BrandsModule,
    VouchersModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
