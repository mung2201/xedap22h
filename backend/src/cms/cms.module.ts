import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminBannersController } from './admin-banners.controller';
import { AdminPagesController } from './admin-pages.controller';
import { CmsService } from './cms.service';
import {
  PublicBannersController,
  PublicSlidersController,
} from './public-banners.controller';
import { PublicPagesController } from './public-pages.controller';
import { Banner, BannerSchema } from './schemas/banner.schema';
import {
  StaticPage,
  StaticPageSchema,
} from './schemas/static-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
      { name: StaticPage.name, schema: StaticPageSchema },
    ]),
  ],
  controllers: [
    PublicBannersController,
    PublicSlidersController,
    PublicPagesController,
    AdminBannersController,
    AdminPagesController,
  ],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
