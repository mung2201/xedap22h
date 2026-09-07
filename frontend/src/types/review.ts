import type { ApiMeta } from './api';

export interface Review {
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
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewQuery {
  page?: number;
  limit?: number;
  rating?: number;
}

export interface ProductReviewListResult {
  items: Review[];
  meta: ApiMeta;
}

export interface CreateReviewPayload {
  productId: string;
  orderId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface CreateReviewResult {
  review: Review;
  productRating: {
    averageRating: number;
    reviewCount: number;
  };
}

export interface EligibleReviewOrder {
  orderId: string;
  orderCode: string;
  createdAt: string;
  items: Array<{
    color: string;
    size: string;
    image: string;
    sku: string;
  }>;
}

export interface ReviewEligibility {
  eligibleOrders: EligibleReviewOrder[];
}
