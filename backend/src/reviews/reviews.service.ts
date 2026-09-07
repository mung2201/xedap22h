import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/commerce.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { ProductReviewQueryDto } from './dto/product-review-query.dto';
import { Review, ReviewDocument } from './schemas/review.schema';

export interface ReviewResponse {
  id: string;
  productId: string;
  orderId: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  rating: number;
  comment?: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRatingSummary {
  averageRating: number;
  reviewCount: number;
}

export interface CreateReviewResult {
  review: ReviewResponse;
  productRating: ProductRatingSummary;
}

export interface EligibleReviewOrder {
  orderId: string;
  orderCode: string;
  createdAt: Date;
  items: Array<{
    color: string;
    size: string;
    image: string;
    sku: string;
  }>;
}

export interface ReviewEligibilityResponse {
  eligibleOrders: EligibleReviewOrder[];
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(
    userId: string,
    dto: CreateReviewDto,
  ): Promise<CreateReviewResult> {
    const session = await this.connection.startSession();
    let result: CreateReviewResult | undefined;

    try {
      await session.withTransaction(async () => {
        const [user, product] = await Promise.all([
          this.userModel.findById(userId).session(session).exec(),
          this.productModel.findById(dto.productId).session(session).exec(),
        ]);

        const reviewer = this.assertCustomerUser(user);

        if (!product) {
          throw new NotFoundException('Product not found.');
        }

        const deliveredOrder = await this.orderModel
          .findOne({
            _id: dto.orderId,
            user: userId,
            orderStatus: OrderStatus.DELIVERED,
            'items.productId': dto.productId,
          })
          .session(session)
          .exec();

        if (!deliveredOrder) {
          throw new ForbiddenException(
            'Only customers with a delivered order containing this product can review it.',
          );
        }

        const existingReview = await this.reviewModel
          .exists({ user: userId, product: dto.productId, order: dto.orderId })
          .session(session)
          .exec();

        if (existingReview) {
          throw new ConflictException(
            'This product has already been reviewed for the selected order.',
          );
        }

        const [review] = await this.reviewModel.create(
          [
            {
              user: new Types.ObjectId(userId),
              product: product._id,
              order: deliveredOrder._id,
              authorName: reviewer.fullName,
              ...(reviewer.avatarUrl
                ? { authorAvatarUrl: reviewer.avatarUrl }
                : {}),
              rating: dto.rating,
              ...(dto.comment ? { comment: dto.comment } : {}),
              images: dto.images ?? [],
            },
          ],
          { session },
        );

        const productRating = await this.recalculateProductRating(
          product._id,
          session,
        );

        const updateResult = await this.productModel
          .updateOne(
            { _id: product._id },
            { $set: productRating },
            { session },
          )
          .exec();

        if (updateResult.modifiedCount !== 1) {
          throw new NotFoundException('Product not found.');
        }

        result = {
          review: this.toResponse(review),
          productRating,
        };
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'This product has already been reviewed for the selected order.',
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }

    if (!result) {
      throw new ConflictException('Review could not be created. Please try again.');
    }

    return result;
  }

  async findByProduct(
    productId: string,
    query: ProductReviewQueryDto,
  ): Promise<PaginatedResult<ReviewResponse[]>> {
    const product = await this.productModel.exists({ _id: productId }).exec();
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const filter: Record<string, unknown> = { product: productId };
    if (query.rating !== undefined) {
      filter.rating = query.rating;
    }

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      reviews.map((review) => this.toResponse(review)),
      query.page,
      query.limit,
      total,
    );
  }

  async getEligibility(
    userId: string,
    productId: string,
  ): Promise<ReviewEligibilityResponse> {
    const [user, product] = await Promise.all([
      this.userModel.findById(userId).exec(),
      this.productModel.exists({ _id: productId }).exec(),
    ]);

    this.assertCustomerUser(user);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const [deliveredOrders, reviews] = await Promise.all([
      this.orderModel
        .find({
          user: userId,
          orderStatus: OrderStatus.DELIVERED,
          'items.productId': productId,
        })
        .select('orderCode createdAt items')
        .sort({ createdAt: -1 })
        .exec(),
      this.reviewModel.find({ user: userId, product: productId }).select('order').exec(),
    ]);
    const reviewedOrderIds = new Set(reviews.map((review) => review.order.toString()));

    const eligibleOrders = deliveredOrders.flatMap((order) => {
      if (reviewedOrderIds.has(order._id.toString())) {
        return [];
      }

      const items = order.items
        .filter((item) => item.productId.toString() === productId)
        .map((item) => ({
          color: item.color,
          size: item.size,
          image: item.image,
          sku: item.sku,
        }));

      return items.length
        ? [
            {
              orderId: order._id.toString(),
              orderCode: order.orderCode,
              createdAt: order.createdAt,
              items,
            },
          ]
        : [];
    });

    return { eligibleOrders };
  }

  private assertCustomerUser(user: UserDocument | null): UserDocument {
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can submit reviews.');
    }

    return user;
  }

  private async recalculateProductRating(
    productId: Types.ObjectId,
    session: ClientSession,
  ): Promise<ProductRatingSummary> {
    const statistics = (await this.reviewModel
      .aggregate([
        { $match: { product: productId } },
        {
          $group: {
            _id: '$product',
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ])
      .session(session)
      .exec()) as Array<{ averageRating: number; reviewCount: number }>;
    const summary = statistics[0];

    return {
      averageRating: summary
        ? Math.round(summary.averageRating * 100) / 100
        : 0,
      reviewCount: summary?.reviewCount ?? 0,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code === 11000
      : false;
  }

  private toResponse(review: ReviewDocument): ReviewResponse {
    return {
      id: review._id.toString(),
      productId: review.product.toString(),
      orderId: review.order.toString(),
      author: {
        id: review.user.toString(),
        fullName: review.authorName,
        ...(review.authorAvatarUrl ? { avatarUrl: review.authorAvatarUrl } : {}),
      },
      rating: review.rating,
      ...(review.comment ? { comment: review.comment } : {}),
      images: review.images ?? [],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
