import type { ApiMeta } from './api';

export enum ServiceBookingType {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  ASSEMBLY = 'ASSEMBLY',
  BIKE_FIT = 'BIKE_FIT',
}

export enum ServiceBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ServiceBooking {
  id: string;
  bookingCode: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  serviceType: ServiceBookingType;
  preferredDate: string;
  preferredTimeSlot: string;
  serviceLocation: string;
  bicycleBrand?: string;
  bicycleModel?: string;
  description: string;
  status: ServiceBookingStatus;
  statusHistory: Array<{
    status: ServiceBookingStatus;
    note?: string;
    changedAt: string;
  }>;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceBookingPayload {
  serviceType: ServiceBookingType;
  contactName: string;
  contactPhone: string;
  preferredDate: string;
  preferredTimeSlot: string;
  serviceLocation: string;
  bicycleBrand?: string;
  bicycleModel?: string;
  description: string;
}

export interface ServiceBookingQuery {
  page?: number;
  limit?: number;
  status?: ServiceBookingStatus;
}

export interface AdminServiceBookingQuery extends ServiceBookingQuery {
  serviceType?: ServiceBookingType;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateServiceBookingStatusPayload {
  status: ServiceBookingStatus;
  note?: string;
  adminNote?: string;
}

export interface ServiceBookingListResult {
  items: ServiceBooking[];
  meta: ApiMeta;
}

export const serviceBookingTypeLabels: Record<ServiceBookingType, string> = {
  [ServiceBookingType.MAINTENANCE]: 'Bảo dưỡng định kỳ',
  [ServiceBookingType.REPAIR]: 'Sửa chữa',
  [ServiceBookingType.ASSEMBLY]: 'Lắp ráp / căn chỉnh',
  [ServiceBookingType.BIKE_FIT]: 'Bike fitting',
};

export const serviceBookingStatusLabels: Record<ServiceBookingStatus, string> = {
  [ServiceBookingStatus.PENDING]: 'Chờ xác nhận',
  [ServiceBookingStatus.CONFIRMED]: 'Đã xác nhận',
  [ServiceBookingStatus.IN_PROGRESS]: 'Đang thực hiện',
  [ServiceBookingStatus.COMPLETED]: 'Hoàn thành',
  [ServiceBookingStatus.CANCELLED]: 'Đã hủy',
};
