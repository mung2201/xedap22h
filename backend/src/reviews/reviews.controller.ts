import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateReviewDto } from './dto/create-review.dto';
import { ProductReviewQueryDto } from './dto/product-review-query.dto';
import {
  CreateReviewResult,
  ReviewEligibilityResponse,
  ReviewResponse,
  ReviewsService,
} from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Roles(UserRole.CUSTOMER)
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review for an owned delivered order item' })
  @ResponseMessage('Review created successfully.')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<CreateReviewResult> {
    return this.reviewsService.create(user.userId, dto);
  }

  @Get('eligibility/:productId')
  @ApiOperation({ summary: 'Get delivered orders eligible to review a product' })
  @ResponseMessage('Get review eligibility successfully.')
  eligibility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseMongoIdPipe) productId: string,
  ): Promise<ReviewEligibilityResponse> {
    return this.reviewsService.getEligibility(user.userId, productId);
  }
}

@ApiTags('Product Reviews')
@Controller({ path: 'products', version: '1' })
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get(':productId/reviews')
  @ApiOperation({ summary: 'Get paginated public reviews of a product' })
  @ApiQuery({ type: ProductReviewQueryDto })
  @ResponseMessage('Get product reviews successfully.')
  findByProduct(
    @Param('productId', ParseMongoIdPipe) productId: string,
    @Query() query: ProductReviewQueryDto,
  ): Promise<PaginatedResult<ReviewResponse[]>> {
    return this.reviewsService.findByProduct(productId, query);
  }
}
