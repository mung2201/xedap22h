import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  CmsBanner,
  CmsBannerListResult,
  CmsBannerPayload,
  CmsBannerQuery,
  PublicCmsBannerQuery,
  StaticPage,
  StaticPageListResult,
  StaticPagePayload,
  StaticPageQuery,
} from '../../types/cms';

const toBannerListResult = (
  response: ApiResponse<CmsBanner[]>,
): CmsBannerListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

const toStaticPageListResult = (
  response: ApiResponse<StaticPage[]>,
): StaticPageListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const cmsService = {
  async getPublicBanners(
    query: PublicCmsBannerQuery = {},
  ): Promise<CmsBanner[]> {
    const response = await apiClient.get<ApiResponse<CmsBanner[]>>('/banners', {
      params: query,
    });
    return response.data.data;
  },

  async getPublicSliders(): Promise<CmsBanner[]> {
    const response = await apiClient.get<ApiResponse<CmsBanner[]>>('/sliders');
    return response.data.data;
  },

  async getPublicPages(): Promise<StaticPage[]> {
    const response = await apiClient.get<ApiResponse<StaticPage[]>>('/pages');
    return response.data.data;
  },

  async getPublicPage(slug: string): Promise<StaticPage> {
    const response = await apiClient.get<ApiResponse<StaticPage>>(`/pages/${slug}`);
    return response.data.data;
  },

  async getAdminBanners(
    query: CmsBannerQuery = {},
  ): Promise<CmsBannerListResult> {
    const response = await apiClient.get<ApiResponse<CmsBanner[]>>('/admin/banners', {
      params: query,
    });
    return toBannerListResult(response.data);
  },

  async createBanner(payload: CmsBannerPayload): Promise<CmsBanner> {
    const response = await apiClient.post<ApiResponse<CmsBanner>>('/admin/banners', payload);
    return response.data.data;
  },

  async updateBanner(
    bannerId: string,
    payload: Partial<CmsBannerPayload>,
  ): Promise<CmsBanner> {
    const response = await apiClient.patch<ApiResponse<CmsBanner>>(
      `/admin/banners/${bannerId}`,
      payload,
    );
    return response.data.data;
  },

  async removeBanner(bannerId: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/admin/banners/${bannerId}`,
    );
    return response.data.data;
  },

  async getAdminPages(
    query: StaticPageQuery = {},
  ): Promise<StaticPageListResult> {
    const response = await apiClient.get<ApiResponse<StaticPage[]>>('/admin/pages', {
      params: query,
    });
    return toStaticPageListResult(response.data);
  },

  async createStaticPage(payload: StaticPagePayload): Promise<StaticPage> {
    const response = await apiClient.post<ApiResponse<StaticPage>>('/admin/pages', payload);
    return response.data.data;
  },

  async updateStaticPage(
    pageId: string,
    payload: Partial<StaticPagePayload>,
  ): Promise<StaticPage> {
    const response = await apiClient.patch<ApiResponse<StaticPage>>(
      `/admin/pages/${pageId}`,
      payload,
    );
    return response.data.data;
  },

  async removeStaticPage(pageId: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/admin/pages/${pageId}`,
    );
    return response.data.data;
  },
};
