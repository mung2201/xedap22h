import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '../mail/mail.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminProductQuestionsController } from './admin-product-questions.controller';
import {
  ProductQuestionsController,
  PublicProductQuestionsController,
} from './product-questions.controller';
import { ProductQuestionsService } from './product-questions.service';
import {
  ProductQuestion,
  ProductQuestionSchema,
} from './schemas/product-question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductQuestion.name, schema: ProductQuestionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [
    PublicProductQuestionsController,
    ProductQuestionsController,
    AdminProductQuestionsController,
  ],
  providers: [ProductQuestionsService],
  exports: [ProductQuestionsService],
})
export class ProductQuestionsModule {}
