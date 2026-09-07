import type { ApiMeta } from './api';

export enum ProductQuestionStatus {
  PENDING = 'PENDING',
  ANSWERED = 'ANSWERED',
  HIDDEN = 'HIDDEN',
}

export interface ProductQuestionProductReference {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
}

export interface ProductQuestionAnswer {
  content: string;
  answeredByName: string;
  answeredAt: string;
}

export interface ProductQuestion {
  id: string;
  product: ProductQuestionProductReference;
  question: string;
  status: ProductQuestionStatus;
  answer?: ProductQuestionAnswer;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductQuestion extends ProductQuestion {
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface ProductQuestionCreatePayload {
  productId: string;
  question: string;
}

export interface ProductQuestionQuery {
  page?: number;
  limit?: number;
}

export interface MyProductQuestionQuery extends ProductQuestionQuery {
  status?: ProductQuestionStatus;
}

export interface AdminProductQuestionQuery extends MyProductQuestionQuery {
  productId?: string;
  keyword?: string;
}

export interface UpdateProductQuestionPayload {
  status: ProductQuestionStatus;
  answer?: string;
}

export interface ProductQuestionListResult {
  items: ProductQuestion[];
  meta: ApiMeta;
}

export interface AdminProductQuestionListResult {
  items: AdminProductQuestion[];
  meta: ApiMeta;
}

export const productQuestionStatusLabels: Record<ProductQuestionStatus, string> = {
  [ProductQuestionStatus.PENDING]: 'Chờ phản hồi',
  [ProductQuestionStatus.ANSWERED]: 'Đã trả lời',
  [ProductQuestionStatus.HIDDEN]: 'Đã ẩn',
};
