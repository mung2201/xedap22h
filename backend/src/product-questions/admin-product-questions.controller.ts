import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
import { AdminProductQuestionQueryDto } from './dto/admin-product-question-query.dto';
import { UpdateProductQuestionDto } from './dto/update-product-question.dto';
import {
  AdminProductQuestionResponse,
  ProductQuestionsService,
} from './product-questions.service';

@ApiTags('Admin Product Questions')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_PRODUCTS)
@Controller({ path: 'admin/product-questions', version: '1' })
export class AdminProductQuestionsController {
  constructor(
    private readonly productQuestionsService: ProductQuestionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List product questions for administration' })
  @ApiQuery({ type: AdminProductQuestionQueryDto })
  @ResponseMessage('Get product questions successfully.')
  findAll(
    @Query() query: AdminProductQuestionQueryDto,
  ): Promise<PaginatedResult<AdminProductQuestionResponse[]>> {
    return this.productQuestionsService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one product question for administration' })
  @ResponseMessage('Get product question successfully.')
  findOne(
    @Param('id', ParseMongoIdPipe) questionId: string,
  ): Promise<AdminProductQuestionResponse> {
    return this.productQuestionsService.findAdminById(questionId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Answer, reopen, or hide a product question' })
  @ResponseMessage('Product question updated successfully.')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) questionId: string,
    @Body() dto: UpdateProductQuestionDto,
  ): Promise<AdminProductQuestionResponse> {
    return this.productQuestionsService.updateByAdmin(
      questionId,
      dto,
      actor.userId,
    );
  }
}
