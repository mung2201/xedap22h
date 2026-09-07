import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSizeGuidesController } from './admin-size-guides.controller';
import { SizeGuideController } from './size-guide.controller';
import { SizeGuide, SizeGuideSchema } from './schemas/size-guide.schema';
import { SizeGuidesService } from './size-guides.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SizeGuide.name, schema: SizeGuideSchema },
    ]),
  ],
  controllers: [SizeGuideController, AdminSizeGuidesController],
  providers: [SizeGuidesService],
  exports: [SizeGuidesService],
})
export class SizeGuideModule {}
