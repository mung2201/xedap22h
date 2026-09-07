import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ChatbotMessageResponse,
  ChatbotService,
  FaqSuggestionResponse,
} from './chatbot.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';

@Public()
@ApiTags('FAQ Chatbot')
@Controller({ path: 'chatbot', version: '1' })
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('suggestions')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get active FAQ question suggestions for the chatbot' })
  @ResponseMessage('Get chatbot suggestions successfully.')
  suggestions(): Promise<FaqSuggestionResponse[]> {
    return this.chatbotService.findPublicSuggestions();
  }

  @Post('message')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Answer a customer message using active FAQ keywords' })
  @ResponseMessage('Chatbot response generated successfully.')
  message(
    @Body() dto: ChatbotMessageDto,
  ): Promise<ChatbotMessageResponse> {
    return this.chatbotService.respond(dto);
  }
}
