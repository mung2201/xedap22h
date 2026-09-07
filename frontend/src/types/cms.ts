import type { ApiMeta } from './api';

export enum CmsBannerType {
  SLIDER = 'SLIDER',
  BANNER = 'BANNER',
}

export enum CmsBannerPosition {
  HOME_HERO = 'HOME_HERO',
  HOME_MIDDLE = 'HOME_MIDDLE',
  HOME_BOTTOM = 'HOME_BOTTOM',
}

export enum StaticPageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export interface CmsBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  buttonLabel?: string;
  openInNewTab: boolean;
  type: CmsBannerType;
  position: CmsBannerPosition;
  sortOrder: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CmsBannerPayload {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  link?: string | null;
  buttonLabel?: string | null;
  openInNewTab?: boolean;
  type: CmsBannerType;
  position: CmsBannerPosition;
  sortOrder?: number;
  active?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CmsBannerQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  type?: CmsBannerType;
  position?: CmsBannerPosition;
  active?: boolean;
}

export interface PublicCmsBannerQuery {
  type?: CmsBannerType;
  position?: CmsBannerPosition;
}

export interface CmsBannerListResult {
  items: CmsBanner[];
  meta: ApiMeta;
}

export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: StaticPageStatus;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaticPagePayload {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  status?: StaticPageStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface StaticPageQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: StaticPageStatus;
}

export interface StaticPageListResult {
  items: StaticPage[];
  meta: ApiMeta;
}

export const cmsBannerTypeLabels: Record<CmsBannerType, string> = {
  [CmsBannerType.SLIDER]: 'Slider',
  [CmsBannerType.BANNER]: 'Banner',
};

export const cmsBannerPositionLabels: Record<CmsBannerPosition, string> = {
  [CmsBannerPosition.HOME_HERO]: 'Trang chủ · Hero',
  [CmsBannerPosition.HOME_MIDDLE]: 'Trang chủ · Giữa trang',
  [CmsBannerPosition.HOME_BOTTOM]: 'Trang chủ · Cuối trang',
};

export const staticPageStatusLabels: Record<StaticPageStatus, string> = {
  [StaticPageStatus.DRAFT]: 'Bản nháp',
  [StaticPageStatus.PUBLISHED]: 'Đã xuất bản',
};
