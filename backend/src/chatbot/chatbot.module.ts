import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminFaqsController } from './admin-faqs.controller';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Faq, FaqSchema } from './schemas/faq.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
  ],
  controllers: [ChatbotController, AdminFaqsController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
