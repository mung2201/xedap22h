export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  __paginated: true;
  data: T;
  meta: PaginationMeta;
}

export const createPaginatedResult = <T>(
  data: T,
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> => ({
  __paginated: true,
  data,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

export const isPaginatedResult = (
  value: unknown,
): value is PaginatedResult<unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (value as { __paginated?: unknown }).__paginated === true;
};
