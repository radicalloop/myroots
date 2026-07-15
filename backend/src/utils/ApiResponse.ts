import { PaginationMeta } from '../types/common.types';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export const ApiResponse = {
  success<T>(data: T, message: string): ApiSuccessResponse<T> {
    return { success: true, message, data };
  },

  created<T>(data: T, message: string): ApiSuccessResponse<T> {
    return { success: true, message, data };
  },

  paginated<T>(
    data: T[],
    meta: PaginationMeta,
    message: string,
  ): ApiPaginatedResponse<T> {
    return { success: true, message, data, meta };
  },
};

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
  };
}
