import axios from 'axios';
import type { ApiErrorResponse } from '../types/api';

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data.message ?? 'The request could not be completed.';
  }

  return error instanceof Error ? error.message : 'An unexpected error occurred.';
};
