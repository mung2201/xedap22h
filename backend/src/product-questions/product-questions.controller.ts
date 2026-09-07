import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateProductQuestionDto } from './dto/create-product-question.dto';
import { MyProductQuestionQueryDto } from './dto/my-product-question-query.dto';
import { ProductQuestionQueryDto } from './dto/product-question-query.dto';
import {
  ProductQuestionResponse,
  ProductQuestionsService,
} from './product-questions.service';

@ApiTags('Product Questions')
@Controller({ path: 'products', version: '1' })
export class PublicProductQuestionsController {
  constructor(
    private readonly productQuestionsService: ProductQuestionsService,
  ) {}

  @Public()
  @Get(':productId/questions')
  @ApiOperation({ summary: 'Get publicly answered questions for a product' })
  @ApiQuery({ type: ProductQuestionQueryDto })
  @ResponseMessage('Get product questions successfully.')
  findByProduct(
    @Param('productId', ParseMongoIdPipe) productId: string,
    @Query() query: ProductQuestionQueryDto,
  ): Promise<PaginatedResult<ProductQuestionResponse[]>> {
    return this.productQuestionsService.findPublicByProduct(productId, query);
  }
}

@ApiTags('Product Questions')
@ApiBearerAuth('access-token')
@Roles(UserRole.CUSTOMER)
@Controller({ path: 'product-questions', version: '1' })
export class ProductQuestionsController {
  constructor(
    private readonly productQuestionsService: ProductQuestionsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ask a product question as a customer' })
  @ResponseMessage('Product question submitted successfully.')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductQuestionDto,
  ): Promise<ProductQuestionResponse> {
    return this.productQuestionsService.create(user.userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get the authenticated customer product questions' })
  @ApiQuery({ type: MyProductQuestionQueryDto })
  @ResponseMessage('Get product questions successfully.')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyProductQuestionQueryDto,
  ): Promise<PaginatedResult<ProductQuestionResponse[]>> {
    return this.productQuestionsService.findMine(user.userId, query);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned pending product question' })
  @ResponseMessage('Product question deleted successfully.')
  removeMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) questionId: string,
  ): Promise<{ id: string }> {
    return this.productQuestionsService.removeMine(user.userId, questionId);
  }
}
