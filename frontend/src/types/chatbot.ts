import type { ApiMeta } from './api';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqPayload {
  question: string;
  answer: string;
  keywords: string[];
  priority?: number;
  active?: boolean;
}

export interface FaqQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  active?: boolean;
}

export interface FaqListResult {
  items: FaqEntry[];
  meta: ApiMeta;
}

export interface ChatbotSuggestion {
  id: string;
  question: string;
}

export interface ChatbotMessagePayload {
  message: string;
}

export interface ChatbotMessageResponse {
  type: 'FAQ' | 'FALLBACK';
  message: string;
  matchedFaqId?: string;
  suggestions: ChatbotSuggestion[];
}
