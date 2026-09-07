import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ChatbotService, FaqResponse } from './chatbot.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@ApiTags('Admin FAQ Chatbot')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_CHATBOT)
@Controller({ path: 'admin/chatbot/faqs', version: '1' })
export class AdminFaqsController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get()
  @ApiOperation({ summary: 'List FAQ entries for administration' })
  @ApiQuery({ type: FaqQueryDto })
  @ResponseMessage('Get FAQ entries successfully.')
  findAll(
    @Query() query: FaqQueryDto,
  ): Promise<PaginatedResult<FaqResponse[]>> {
    return this.chatbotService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one FAQ entry' })
  @ResponseMessage('Get FAQ entry successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) faqId: string,
  ): Promise<FaqResponse> {
    return this.chatbotService.findAdminById(faqId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an FAQ entry' })
  @ResponseMessage('FAQ entry created successfully.')
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateFaqDto,
  ): Promise<FaqResponse> {
    return this.chatbotService.create(dto, actor.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an FAQ entry' })
  @ResponseMessage('FAQ entry updated successfully.')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) faqId: string,
    @Body() dto: UpdateFaqDto,
  ): Promise<FaqResponse> {
    return this.chatbotService.update(faqId, dto, actor.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an FAQ entry' })
  @ResponseMessage('FAQ entry deleted successfully.')
  remove(
    @Param('id', ParseMongoIdPipe) faqId: string,
  ): Promise<{ id: string }> {
    return this.chatbotService.remove(faqId);
  }
}
