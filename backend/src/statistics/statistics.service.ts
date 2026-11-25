import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderStatus, PaymentStatus } from '../common/enums/commerce.enum';
import { ProductStatus } from '../common/enums/catalog.enum';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { User } from '../users/schemas/user.schema';
import { DashboardPeriod, DashboardQueryDto } from './dto/dashboard-query.dto';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_CUSTOM_RANGE_DAYS = 366;

export interface DashboardStatisticsResponse {
  range: {
    period: DashboardPeriod;
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalRevenue: number;
    revenueToday: number;
    revenueThisMonth: number;
    rangeRevenue: number;
    rangeOrderCount: number;
    totalOrders: number;
    pendingOrders: number;
    shippingOrders: number;
    completedOrders: number;
    totalUsers: number;
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>;
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    image: string;
    soldQuantity: number;
    revenue: number;
  }>;
  topCategories: Array<{
    categoryId?: string;
    name: string;
    soldQuantity: number;
    revenue: number;
  }>;
  lowStockItems: Array<{
    productId: string;
    name: string;
    slug: string;
    thumbnail: string;
    availableStock: number;
  }>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {}

  async getDashboard(
    query: DashboardQueryDto,
  ): Promise<DashboardStatisticsResponse> {
    const now = new Date();
    const range = this.resolveRange(query, now);
    const today = this.getStartOfVietnamDay(now);
    const monthStart = this.getStartOfVietnamMonth(now);
    const lowStockThreshold = this.configService.getOrThrow<number>(
      'inventory.lowStockThreshold',
    );

    const [
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      rangeSummary,
      totalOrders,
      pendingOrders,
      shippingOrders,
      completedOrders,
      totalUsers,
      totalProducts,
      revenueByDay,
      revenueByMonth,
      ordersByStatus,
      topProducts,
      topCategories,
      inventory,
    ] = await Promise.all([
      this.getRevenueSummary(),
      this.getRevenueSummary({ startDate: today, endDate: now }),
      this.getRevenueSummary({ startDate: monthStart, endDate: now }),
      this.getRevenueSummary(range),
      this.orderModel.countDocuments({}).exec(),
      this.orderModel.countDocuments({ orderStatus: OrderStatus.PENDING }).exec(),
      this.orderModel.countDocuments({ orderStatus: OrderStatus.SHIPPING }).exec(),
      this.orderModel.countDocuments({ orderStatus: OrderStatus.DELIVERED }).exec(),
      this.userModel.countDocuments({}).exec(),
      this.productModel.countDocuments({}).exec(),
      this.getRevenueByDay(range),
      this.getRevenueByMonth(range),
      this.getOrdersByStatus(range),
      this.getTopProducts(range),
      this.getTopCategories(range),
      this.getInventorySummary(lowStockThreshold),
    ]);

    return {
      range: {
        period: query.period,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      summary: {
        totalRevenue: totalRevenue.revenue,
        revenueToday: revenueToday.revenue,
        revenueThisMonth: revenueThisMonth.revenue,
        rangeRevenue: rangeSummary.revenue,
        rangeOrderCount: rangeSummary.orders,
        totalOrders,
        pendingOrders,
        shippingOrders,
        completedOrders,
        totalUsers,
        totalProducts,
        lowStockProducts: inventory.lowStockProducts,
        outOfStockProducts: inventory.outOfStockProducts,
      },
      revenueByDay,
      revenueByMonth,
      ordersByStatus,
      topProducts,
      topCategories,
      lowStockItems: inventory.lowStockItems,
    };
  }

  private resolveRange(query: DashboardQueryDto, now: Date): DateRange {
    if (query.period === DashboardPeriod.CUSTOM) {
      if (!query.startDate || !query.endDate) {
        throw new BadRequestException(
          'startDate and endDate are required for a custom dashboard range.',
        );
      }
      if (
        !(query.startDate instanceof Date) ||
        !(query.endDate instanceof Date) ||
        !Number.isFinite(query.startDate.getTime()) ||
        !Number.isFinite(query.endDate.getTime())
      ) {
        throw new BadRequestException('startDate and endDate must be valid dates.');
      }
      const startDate = this.getStartOfVietnamDay(query.startDate);
      const endDate = this.getEndOfVietnamDay(query.endDate);
      if (startDate > endDate) {
        throw new BadRequestException('startDate must be before endDate.');
      }
      if (
        endDate.getTime() - startDate.getTime() + 1 >
        MAX_CUSTOM_RANGE_DAYS * DAY_MS
      ) {
        throw new BadRequestException(
          `A custom dashboard range must not exceed ${MAX_CUSTOM_RANGE_DAYS} days.`,
        );
      }
      return { startDate, endDate };
    }

    const today = this.getStartOfVietnamDay(now);
    let startDate: Date;
    switch (query.period) {
      case DashboardPeriod.LAST_7_DAYS:
        startDate = this.addVietnamDays(today, -6);
        break;
      case DashboardPeriod.THIS_MONTH:
        startDate = this.getStartOfVietnamMonth(now);
        break;
      case DashboardPeriod.THIS_YEAR:
        startDate = this.getStartOfVietnamYear(now);
        break;
      case DashboardPeriod.LAST_30_DAYS:
      default:
        startDate = this.addVietnamDays(today, -29);
        break;
    }

    return { startDate, endDate: now };
  }

  private getPaidOrderMatch(range?: DateRange): Record<string, unknown> {
    const baseMatch: Record<string, unknown> = {
      paymentStatus: PaymentStatus.PAID,
      orderStatus: { $ne: OrderStatus.CANCELLED },
    };

    if (!range) {
      return baseMatch;
    }

    // Older orders do not have paidAt yet, so they retain the historical
    // createdAt fallback while all newly-paid orders are grouped by the real
    // financial event time.
    return {
      ...baseMatch,
      $or: [
        { paidAt: { $gte: range.startDate, $lte: range.endDate } },
        {
          // MongoDB null matches both a missing field and an explicit null,
          // consistent with the $ifNull used to group the revenue series.
          paidAt: null,
          createdAt: { $gte: range.startDate, $lte: range.endDate },
        },
      ],
    };
  }

  private async getRevenueSummary(
    range?: DateRange,
  ): Promise<{ revenue: number; orders: number }> {
    const [summary] = (await this.orderModel
      .aggregate([
        { $match: this.getPaidOrderMatch(range) },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
      ])
      .exec()) as Array<{ revenue: number; orders: number }>;

    return {
      revenue: summary?.revenue ?? 0,
      orders: summary?.orders ?? 0,
    };
  }

  private async getRevenueByDay(
    range: DateRange,
  ): Promise<Array<{ date: string; revenue: number; orders: number }>> {
    const points = (await this.orderModel
      .aggregate([
        { $match: this.getPaidOrderMatch(range) },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $ifNull: ['$paidAt', '$createdAt'] },
                timezone: VIETNAM_TIMEZONE,
              },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
      ])
      .exec()) as Array<{ date: string; revenue: number; orders: number }>;

    return this.fillDailyRevenue(points, range);
  }

  private async getRevenueByMonth(
    range: DateRange,
  ): Promise<Array<{ month: string; revenue: number; orders: number }>> {
    const points = (await this.orderModel
      .aggregate([
        { $match: this.getPaidOrderMatch(range) },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: { $ifNull: ['$paidAt', '$createdAt'] },
                timezone: VIETNAM_TIMEZONE,
              },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: '$_id', revenue: 1, orders: 1 } },
      ])
      .exec()) as Array<{ month: string; revenue: number; orders: number }>;

    return this.fillMonthlyRevenue(points, range);
  }

  private async getOrdersByStatus(
    range: DateRange,
  ): Promise<Array<{ status: OrderStatus; count: number }>> {
    const counts = (await this.orderModel
      .aggregate([
        { $match: { createdAt: { $gte: range.startDate, $lte: range.endDate } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ])
      .exec()) as Array<{ status: OrderStatus; count: number }>;

    const countByStatus = new Map(
      counts.map((item) => [item.status, item.count]),
    );
    return Object.values(OrderStatus).map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }));
  }

  private fillDailyRevenue(
    points: Array<{ date: string; revenue: number; orders: number }>,
    range: DateRange,
  ): Array<{ date: string; revenue: number; orders: number }> {
    const pointByDate = new Map(points.map((point) => [point.date, point]));
    const result: Array<{ date: string; revenue: number; orders: number }> = [];
    let cursor = this.getStartOfVietnamDay(range.startDate);
    const finalDay = this.getStartOfVietnamDay(range.endDate);

    while (cursor <= finalDay) {
      const date = this.formatVietnamDate(cursor);
      result.push(pointByDate.get(date) ?? { date, revenue: 0, orders: 0 });
      cursor = this.addVietnamDays(cursor, 1);
    }

    return result;
  }

  private fillMonthlyRevenue(
    points: Array<{ month: string; revenue: number; orders: number }>,
    range: DateRange,
  ): Array<{ month: string; revenue: number; orders: number }> {
    const pointByMonth = new Map(points.map((point) => [point.month, point]));
    const result: Array<{ month: string; revenue: number; orders: number }> = [];
    let cursor = this.getStartOfVietnamMonth(range.startDate);
    const finalMonth = this.getStartOfVietnamMonth(range.endDate);

    while (cursor <= finalMonth) {
      const month = this.formatVietnamMonth(cursor);
      result.push(pointByMonth.get(month) ?? { month, revenue: 0, orders: 0 });
      cursor = this.addVietnamMonths(cursor, 1);
    }

    return result;
  }

  private async getTopProducts(
    range: DateRange,
  ): Promise<DashboardStatisticsResponse['topProducts']> {
    const products = (await this.orderModel
      .aggregate([
        { $match: this.getPaidOrderMatch(range) },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            soldQuantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
          },
        },
        { $sort: { revenue: -1, soldQuantity: -1 } },
        { $limit: 5 },
      ])
      .exec()) as Array<{
      _id: { toString(): string };
      name: string;
      image: string;
      soldQuantity: number;
      revenue: number;
    }>;

    return products.map((product) => ({
      productId: product._id.toString(),
      name: product.name,
      image: product.image,
      soldQuantity: product.soldQuantity,
      revenue: product.revenue,
    }));
  }

  private async getTopCategories(
    range: DateRange,
  ): Promise<DashboardStatisticsResponse['topCategories']> {
    const categories = (await this.orderModel
      .aggregate([
        { $match: this.getPaidOrderMatch(range) },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        {
          $set: {
            categoryId: {
              // Historical product references can be strings because the
              // product schema uses Mixed; snapshots also retain precedence.
              $convert: {
                input: {
                  $ifNull: [
                    '$items.categoryId',
                    { $arrayElemAt: ['$product.category', 0] },
                  ],
                },
                to: 'objectId',
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            soldQuantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $sort: { revenue: -1, soldQuantity: -1 } },
        { $limit: 5 },
      ])
      .exec()) as Array<{
      _id?: { toString(): string };
      category?: { name?: string };
      soldQuantity: number;
      revenue: number;
    }>;

    return categories.map((category) => ({
      ...(category._id ? { categoryId: category._id.toString() } : {}),
      name: category.category?.name ?? 'Uncategorized',
      soldQuantity: category.soldQuantity,
      revenue: category.revenue,
    }));
  }

  private async getInventorySummary(
    lowStockThreshold: number,
  ): Promise<{
    lowStockProducts: number;
    outOfStockProducts: number;
    lowStockItems: DashboardStatisticsResponse['lowStockItems'];
  }> {
    const [summary] = (await this.productModel
      .aggregate([
        { $match: { status: ProductStatus.ACTIVE, catalogOnly: { $ne: true } } },
        {
          $project: {
            name: 1,
            slug: 1,
            thumbnail: 1,
            availableStock: { $sum: '$variants.stock' },
          },
        },
        {
          $facet: {
            lowStockProducts: [
              { $match: { availableStock: { $gt: 0, $lte: lowStockThreshold } } },
              { $count: 'count' },
            ],
            outOfStockProducts: [
              { $match: { availableStock: 0 } },
              { $count: 'count' },
            ],
            lowStockItems: [
              { $match: { availableStock: { $lte: lowStockThreshold } } },
              { $sort: { availableStock: 1, name: 1 } },
              { $limit: 8 },
            ],
          },
        },
      ])
      .exec()) as Array<{
      lowStockProducts: Array<{ count: number }>;
      outOfStockProducts: Array<{ count: number }>;
      lowStockItems: Array<{
        _id: { toString(): string };
        name: string;
        slug: string;
        thumbnail: string;
        availableStock: number;
      }>;
    }>;

    return {
      lowStockProducts: summary?.lowStockProducts[0]?.count ?? 0,
      outOfStockProducts: summary?.outOfStockProducts[0]?.count ?? 0,
      lowStockItems: (summary?.lowStockItems ?? []).map((product) => ({
        productId: product._id.toString(),
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail,
        availableStock: product.availableStock,
      })),
    };
  }

  private getStartOfVietnamDay(date: Date): Date {
    const parts = this.getVietnamDateParts(date);
    return this.createVietnamDate(parts.year, parts.month, parts.day);
  }

  private getEndOfVietnamDay(date: Date): Date {
    const parts = this.getVietnamDateParts(date);
    return this.createVietnamDate(parts.year, parts.month, parts.day, 23, 59, 59, 999);
  }

  private getStartOfVietnamMonth(date: Date): Date {
    const parts = this.getVietnamDateParts(date);
    return this.createVietnamDate(parts.year, parts.month, 1);
  }

  private getStartOfVietnamYear(date: Date): Date {
    const parts = this.getVietnamDateParts(date);
    return this.createVietnamDate(parts.year, 0, 1);
  }

  private addVietnamDays(date: Date, days: number): Date {
    const parts = this.getVietnamDateParts(date);
    const shifted = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
    return this.createVietnamDate(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    );
  }

  private addVietnamMonths(date: Date, months: number): Date {
    const parts = this.getVietnamDateParts(date);
    const shifted = new Date(Date.UTC(parts.year, parts.month + months, 1));
    return this.createVietnamDate(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      1,
    );
  }

  private getVietnamDateParts(date: Date): {
    year: number;
    month: number;
    day: number;
  } {
    const shifted = new Date(date.getTime() + VIETNAM_OFFSET_MS);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth(),
      day: shifted.getUTCDate(),
    };
  }

  private createVietnamDate(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  ): Date {
    return new Date(
      Date.UTC(year, month, day, hour, minute, second, millisecond) -
        VIETNAM_OFFSET_MS,
    );
  }

  private formatVietnamDate(date: Date): string {
    const parts = this.getVietnamDateParts(date);
    return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(
      parts.day,
    ).padStart(2, '0')}`;
  }

  private formatVietnamMonth(date: Date): string {
    const parts = this.getVietnamDateParts(date);
    return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}`;
  }
}
