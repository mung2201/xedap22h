import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { createPaginatedResult, PaginatedResult } from '../common/interfaces/pagination.interface';
import {
  ServiceBookingStatus,
  ServiceBookingType,
} from '../common/enums/service-booking.enum';
import { escapeRegExp } from '../common/utils/slug.util';
import { MailService } from '../mail/mail.service';
import { User } from '../users/schemas/user.schema';
import { AdminServiceBookingQueryDto } from './dto/admin-service-booking-query.dto';
import { CancelServiceBookingDto } from './dto/cancel-service-booking.dto';
import { CreateServiceBookingDto } from './dto/create-service-booking.dto';
import { MyServiceBookingsQueryDto } from './dto/my-service-bookings-query.dto';
import { UpdateServiceBookingStatusDto } from './dto/update-service-booking-status.dto';
import {
  ServiceBooking,
  ServiceBookingDocument,
} from './schemas/service-booking.schema';

export interface ServiceBookingResponse {
  id: string;
  bookingCode: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  serviceType: ServiceBookingType;
  preferredDate: Date;
  preferredTimeSlot: string;
  serviceLocation: string;
  bicycleBrand?: string;
  bicycleModel?: string;
  description: string;
  status: ServiceBookingStatus;
  statusHistory: Array<{
    status: ServiceBookingStatus;
    note?: string;
    changedAt: Date;
  }>;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminStatusTransitions: Record<
  ServiceBookingStatus,
  ServiceBookingStatus[]
> = {
  [ServiceBookingStatus.PENDING]: [
    ServiceBookingStatus.CONFIRMED,
    ServiceBookingStatus.CANCELLED,
  ],
  [ServiceBookingStatus.CONFIRMED]: [
    ServiceBookingStatus.IN_PROGRESS,
    ServiceBookingStatus.CANCELLED,
  ],
  [ServiceBookingStatus.IN_PROGRESS]: [
    ServiceBookingStatus.COMPLETED,
    ServiceBookingStatus.CANCELLED,
  ],
  [ServiceBookingStatus.COMPLETED]: [],
  [ServiceBookingStatus.CANCELLED]: [],
};

const customerCancellableStatuses = new Set<ServiceBookingStatus>([
  ServiceBookingStatus.PENDING,
  ServiceBookingStatus.CONFIRMED,
]);

@Injectable()
export class ServiceBookingsService {
  private readonly logger = new Logger(ServiceBookingsService.name);

  constructor(
    @InjectModel(ServiceBooking.name)
    private readonly serviceBookingModel: Model<ServiceBooking>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly mailService: MailService,
  ) {}

  async create(
    userId: string,
    dto: CreateServiceBookingDto,
  ): Promise<ServiceBookingResponse> {
    this.assertPreferredDate(dto.preferredDate);

    const user = await this.userModel
      .findById(userId)
      .select('email')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const booking = await this.serviceBookingModel.create({
      bookingCode: this.createBookingCode(),
      user: new Types.ObjectId(userId),
      contact: {
        name: dto.contactName,
        phone: dto.contactPhone,
        email: user.email,
      },
      serviceType: dto.serviceType,
      preferredDate: dto.preferredDate,
      preferredTimeSlot: dto.preferredTimeSlot,
      serviceLocation: dto.serviceLocation,
      ...(dto.bicycleBrand ? { bicycleBrand: dto.bicycleBrand } : {}),
      ...(dto.bicycleModel ? { bicycleModel: dto.bicycleModel } : {}),
      description: dto.description,
      status: ServiceBookingStatus.PENDING,
      statusHistory: [
        {
          status: ServiceBookingStatus.PENDING,
          note: 'Service booking created.',
          changedBy: new Types.ObjectId(userId),
        },
      ],
    });

    const response = this.toResponse(booking);
    void this.sendConfirmation(response).catch((error: unknown) => {
      this.logger.warn(
        `Could not send service-booking confirmation for ${response.bookingCode}: ${
          error instanceof Error ? error.message : 'unknown mail error'
        }`,
      );
    });

    return response;
  }

  async findMine(
    userId: string,
    query: MyServiceBookingsQueryDto,
  ): Promise<PaginatedResult<ServiceBookingResponse[]>> {
    const filter = {
      user: userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [bookings, total] = await Promise.all([
      this.serviceBookingModel
        .find(filter)
        .sort({ preferredDate: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.serviceBookingModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      bookings.map((booking) => this.toResponse(booking)),
      query.page,
      query.limit,
      total,
    );
  }

  async findMineById(
    userId: string,
    bookingId: string,
  ): Promise<ServiceBookingResponse> {
    return this.toResponse(await this.findOwnedBooking(userId, bookingId));
  }

  async cancelMine(
    userId: string,
    bookingId: string,
    dto: CancelServiceBookingDto,
  ): Promise<ServiceBookingResponse> {
    const booking = await this.findOwnedBooking(userId, bookingId);

    if (!customerCancellableStatuses.has(booking.status)) {
      throw new ConflictException(
        'This service booking can no longer be cancelled by the customer.',
      );
    }

    booking.status = ServiceBookingStatus.CANCELLED;
    booking.statusHistory.push({
      status: ServiceBookingStatus.CANCELLED,
      note: dto.reason,
      changedBy: new Types.ObjectId(userId),
      changedAt: new Date(),
    });
    await booking.save();

    const response = this.toResponse(booking);
    void this.sendStatusUpdate(response, dto.reason).catch((error: unknown) => {
      this.logger.warn(
        `Could not send cancellation notification for ${response.bookingCode}: ${
          error instanceof Error ? error.message : 'unknown mail error'
        }`,
      );
    });

    return response;
  }

  async findAdmin(
    query: AdminServiceBookingQueryDto,
  ): Promise<PaginatedResult<ServiceBookingResponse[]>> {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException('startDate must not be after endDate.');
    }

    const filter: Record<string, unknown> = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    };

    if (query.startDate || query.endDate) {
      filter.preferredDate = {
        ...(query.startDate ? { $gte: query.startDate } : {}),
        ...(query.endDate ? { $lte: query.endDate } : {}),
      };
    }

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [
        { bookingCode: keyword },
        { 'contact.name': keyword },
        { 'contact.phone': keyword },
        { bicycleBrand: keyword },
        { bicycleModel: keyword },
      ];
    }

    const [bookings, total] = await Promise.all([
      this.serviceBookingModel
        .find(filter)
        .sort({ preferredDate: 1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.serviceBookingModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      bookings.map((booking) => this.toResponse(booking)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminById(bookingId: string): Promise<ServiceBookingResponse> {
    const booking = await this.serviceBookingModel.findById(bookingId).exec();

    if (!booking) {
      throw new NotFoundException('Service booking not found.');
    }

    return this.toResponse(booking);
  }

  async updateStatusByAdmin(
    actorUserId: string,
    bookingId: string,
    dto: UpdateServiceBookingStatusDto,
  ): Promise<ServiceBookingResponse> {
    const booking = await this.serviceBookingModel.findById(bookingId).exec();

    if (!booking) {
      throw new NotFoundException('Service booking not found.');
    }

    if (!adminStatusTransitions[booking.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition a ${booking.status} service booking to ${dto.status}.`,
      );
    }

    if (dto.status === ServiceBookingStatus.CANCELLED && !dto.note) {
      throw new BadRequestException('A cancellation reason is required.');
    }

    booking.status = dto.status;
    if (dto.adminNote !== undefined) {
      booking.adminNote = dto.adminNote;
    }
    booking.statusHistory.push({
      status: dto.status,
      ...(dto.note ? { note: dto.note } : {}),
      changedBy: new Types.ObjectId(actorUserId),
      changedAt: new Date(),
    });
    await booking.save();

    const response = this.toResponse(booking);
    void this.sendStatusUpdate(response, dto.note).catch((error: unknown) => {
      this.logger.warn(
        `Could not send status notification for ${response.bookingCode}: ${
          error instanceof Error ? error.message : 'unknown mail error'
        }`,
      );
    });

    return response;
  }

  private async findOwnedBooking(
    userId: string,
    bookingId: string,
  ): Promise<ServiceBookingDocument> {
    const booking = await this.serviceBookingModel
      .findOne({ _id: bookingId, user: userId })
      .exec();

    if (!booking) {
      throw new NotFoundException('Service booking not found.');
    }

    return booking;
  }

  private assertPreferredDate(value: Date): void {
    if (Number.isNaN(value.getTime()) || value.getTime() <= Date.now()) {
      throw new BadRequestException('preferredDate must be in the future.');
    }
  }

  private createBookingCode(): string {
    const date = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    })
      .format(new Date())
      .replaceAll('-', '');
    const suffix = randomBytes(4).toString('hex').toUpperCase();

    return `SRV-${date}-${suffix}`;
  }

  private async sendConfirmation(
    booking: ServiceBookingResponse,
  ): Promise<void> {
    await this.mailService.sendServiceBookingConfirmationEmail({
      to: booking.contact.email,
      fullName: booking.contact.name,
      bookingCode: booking.bookingCode,
      serviceType: booking.serviceType,
      preferredDate: booking.preferredDate,
      preferredTimeSlot: booking.preferredTimeSlot,
    });
  }

  private async sendStatusUpdate(
    booking: ServiceBookingResponse,
    note?: string,
  ): Promise<void> {
    await this.mailService.sendServiceBookingStatusEmail({
      to: booking.contact.email,
      fullName: booking.contact.name,
      bookingCode: booking.bookingCode,
      serviceType: booking.serviceType,
      preferredDate: booking.preferredDate,
      preferredTimeSlot: booking.preferredTimeSlot,
      status: booking.status,
      ...(note ? { note } : {}),
    });
  }

  private toResponse(booking: ServiceBookingDocument): ServiceBookingResponse {
    return {
      id: booking._id.toString(),
      bookingCode: booking.bookingCode,
      contact: {
        name: booking.contact.name,
        phone: booking.contact.phone,
        email: booking.contact.email,
      },
      serviceType: booking.serviceType,
      preferredDate: booking.preferredDate,
      preferredTimeSlot: booking.preferredTimeSlot,
      serviceLocation: booking.serviceLocation,
      ...(booking.bicycleBrand ? { bicycleBrand: booking.bicycleBrand } : {}),
      ...(booking.bicycleModel ? { bicycleModel: booking.bicycleModel } : {}),
      description: booking.description,
      status: booking.status,
      statusHistory: booking.statusHistory.map((history) => ({
        status: history.status,
        ...(history.note ? { note: history.note } : {}),
        changedAt: history.changedAt,
      })),
      ...(booking.adminNote ? { adminNote: booking.adminNote } : {}),
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
