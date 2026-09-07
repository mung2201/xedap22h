import type { BikeType } from './catalog';

export enum RecommendationStep {
  PURPOSE = 'PURPOSE',
  BUDGET = 'BUDGET',
  HEIGHT = 'HEIGHT',
  RESULT = 'RESULT',
}

export interface RecommendationOption {
  value: string;
  label: string;
}

export interface RecommendationInput {
  type: 'NUMBER';
  min: number;
  max: number;
  suffix: string;
  placeholder: string;
}

export interface RecommendedVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
  price: number;
}

export interface ProductRecommendation {
  productId: string;
  name: string;
  image: string;
  price: number;
  salePrice: number;
  reason: string;
  productUrl: string;
  bikeType?: BikeType;
  averageRating: number;
  availableStock: number;
  matchedVariant?: RecommendedVariant;
}

export interface RecommendationFlowResponse {
  sessionId: string;
  type: 'QUESTION' | 'RESULT';
  step: RecommendationStep;
  message: string;
  options?: RecommendationOption[];
  input?: RecommendationInput;
  recommendations?: ProductRecommendation[];
}

export interface RecommendationMessagePayload {
  sessionId: string;
  answer: string;
}
