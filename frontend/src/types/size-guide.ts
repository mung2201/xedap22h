import type { ApiMeta } from './api';
import type { BikeType } from './catalog';

export interface SizeGuideRule {
  id: string;
  bikeType: BikeType;
  minHeightCm: number;
  maxHeightCm: number;
  recommendedSize: string;
  frameSizeLabel: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SizeGuideRulePayload {
  bikeType: BikeType;
  minHeightCm: number;
  maxHeightCm: number;
  recommendedSize: string;
  frameSizeLabel: string;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface SizeGuideQuery {
  page?: number;
  limit?: number;
  bikeType?: BikeType;
  active?: boolean;
}

export interface SizeGuideListResult {
  items: SizeGuideRule[];
  meta: ApiMeta;
}

export interface SizeRecommendationPayload {
  heightCm: number;
  bikeType: BikeType;
}

export interface SizeRecommendation {
  heightCm: number;
  bikeType: BikeType;
  ruleId: string;
  heightRange: {
    minHeightCm: number;
    maxHeightCm: number;
  };
  recommendedSize: string;
  frameSizeLabel: string;
  description?: string;
}
