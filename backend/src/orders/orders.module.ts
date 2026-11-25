import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from '../carts/schemas/cart.schema';
import { CheckoutModule } from '../checkout/checkout.module';
import { MailModule } from '../mail/mail.module';
import { PaymentsModule } from '../payments/payments.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { VouchersModule } from '../vouchers/vouchers.module';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderTrackingController } from './order-tracking.controller';
import { MomoPaymentController } from './momo-payment.controller';
import { PayosPaymentController } from './payos-payment.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Cart.name, schema: CartSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CheckoutModule,
    VouchersModule,
    PaymentsModule,
    MailModule,
  ],
  controllers: [OrdersController, AdminOrdersController, OrderTrackingController, MomoPaymentController, PayosPaymentController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
