import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '../mail/mail.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminServiceBookingsController } from './admin-service-bookings.controller';
import { ServiceBookingsController } from './service-bookings.controller';
import {
  ServiceBooking,
  ServiceBookingSchema,
} from './schemas/service-booking.schema';
import { ServiceBookingsService } from './service-bookings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceBooking.name, schema: ServiceBookingSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [ServiceBookingsController, AdminServiceBookingsController],
  providers: [ServiceBookingsService],
})
export class ServiceBookingsModule {}
