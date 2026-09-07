import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { SizeGuide, SizeGuideSchema } from '../size-guide/schemas/size-guide.schema';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import {
  RecommendationSession,
  RecommendationSessionSchema,
} from './schemas/recommendation-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecommendationSession.name, schema: RecommendationSessionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: SizeGuide.name, schema: SizeGuideSchema },
    ]),
    CategoriesModule,
    BrandsModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
