/**
 * Pagination metadata attached to every list endpoint.
 * Field names match the client contract exactly.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1 && total > 0,
  };
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { items, meta: buildMeta(total, page, limit) };
}

/** Convert a validated page/limit pair into a Mongo skip value. */
export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
