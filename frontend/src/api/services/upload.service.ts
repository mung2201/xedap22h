import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { UploadedImage } from '../../types/upload';

const upload = async (path: string, file: File): Promise<UploadedImage> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<UploadedImage>>(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data;
};

export const uploadService = {
  uploadAvatar(file: File): Promise<UploadedImage> {
    return upload('/uploads/avatar', file);
  },

  uploadManagementImage(file: File): Promise<UploadedImage> {
    return upload('/uploads/images', file);
  },
};
